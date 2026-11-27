import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import Layout from '../components/Layout';
import BatchChildrenModal from '../components/BatchChildrenModal';
import { genderTint } from './tree/shared';
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface MemberListProps {
  user: User | null;
}

export default function MemberList({ user }: MemberListProps) {
  const navigate = useNavigate();
  const { members, generationChars, loading, error, deleteMember, refresh } = useFamilyMembers(user?.id);
  const { isAdmin } = useUserRole(user?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [generationFilter, setGenerationFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;

  const [sortField, setSortField] = useState<'generation' | 'sibling_rank' | 'family_rank' | 'name'>('generation');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isBatchChildrenModalOpen, setIsBatchChildrenModalOpen] = useState(false);
  const [selectedParentIds, setSelectedParentIds] = useState<number[]>([]);

  const memberChildrenCount = useMemo(() => {
    const countMap: Record<string, number> = {};
    members.forEach(m => {
      if (m.parent_id) {
        countMap[m.parent_id] = (countMap[m.parent_id] || 0) + 1;
      }
    });
    return countMap;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone?.includes(searchTerm) ?? false);
      const matchesGender = genderFilter ? member.gender === genderFilter : true;
      const matchesGeneration = generationFilter ? member.generation === parseInt(generationFilter) : true;
      return matchesSearch && matchesGender && matchesGeneration;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'generation') {
        comparison = (a.generation || 0) - (b.generation || 0);
        if (comparison === 0) {
          comparison = (a.sibling_rank || 0) - (b.sibling_rank || 0);
        }
      } else if (sortField === 'sibling_rank') {
        comparison = (a.sibling_rank || 0) - (b.sibling_rank || 0);
      } else if (sortField === 'family_rank') {
        comparison = (a.family_rank || 0) - (b.family_rank || 0);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [members, searchTerm, genderFilter, generationFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这位家人吗？')) return;
    try {
      await deleteMember(id);
    } catch {
      alert('删除失败');
    }
  };

  const openBatchChildrenModal = (parentId: number) => {
    setSelectedParentIds([parentId]);
    setIsBatchChildrenModalOpen(true);
  };

  const closeBatchChildrenModal = () => {
    setIsBatchChildrenModalOpen(false);
    setSelectedParentIds([]);
  };

  const getGenderLabel = (gender: string | null) => {
    const labels: Record<string, string> = { male: '男', female: '女' };
    return labels[gender || ''] || '-';
  };

  const getGenderColor = genderTint;

  return (
    <Layout user={user} title="家人列表">
      <div className="space-y-3 p-3 sm:p-4">
        {/* 搜索和筛选区 - 移动端优化 */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索姓名或电话"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ui-input pl-9"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
          
          {/* 筛选条件 */}
          <div className={`flex flex-col sm:flex-row gap-2 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="ui-select w-full sm:w-auto"
            >
              <option value="">全部性别</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
            <select
              value={generationFilter}
              onChange={(e) => setGenerationFilter(e.target.value)}
              className="ui-select w-full sm:w-auto"
            >
              <option value="">全部辈份</option>
              {generationChars.map(gc => (
                <option key={gc.generation} value={gc.generation}>
                  第{gc.generation}世 · {gc.char}字辈
                </option>
              ))}
            </select>
          </div>
          
          {/* 操作按钮 - 仅管理员可见 */}
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/members/batch-edit')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gilt-500 text-gilt-600 rounded-lg hover:bg-gilt-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                批量编辑
              </button>
              <button
                onClick={() => navigate('/members/batch')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-cinnabar-600 text-cinnabar-600 rounded-lg hover:bg-cinnabar-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                批量添加
              </button>
              <button
                onClick={() => navigate('/members/new')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-cinnabar-600 text-paper-card rounded-lg hover:bg-cinnabar-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加家人
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">加载中...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <>
            {/* 移动端卡片列表 */}
            <div className="block sm:hidden space-y-3">
              {paginatedMembers.map((member) => (
                <div key={member.id} className="ui-card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`ui-avatar w-10 h-10 text-sm ${getGenderColor(member.gender)}`}>
                      {member.name.slice(-1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{member.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getGenderColor(member.gender)}`}>
                          {getGenderLabel(member.gender)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="ui-chip bg-gilt-100 text-gilt-700">
                          第{member.generation}世
                        </span>
                        <span className="ui-chip bg-cinnabar-50 text-cinnabar-700">
                          {member.generation_char || '-'}字辈
                        </span>
                        <span className="ui-chip bg-jade-100 text-jade-700">
                          同辈第{member.sibling_rank || 1}位
                        </span>
                        <span className="ui-chip bg-blue-100 text-blue-700">
                          家庭第{member.family_rank || 1}位
                        </span>
                      </div>
                      {member.spouse_name && (
                        <div className="text-xs text-slate-500 mt-1">
                          配偶: {member.spouse_name}
                        </div>
                      )}
                      {/* 快捷操作 - 仅管理员可见 */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => openBatchChildrenModal(member.id)}
                            className="flex-1 py-2 text-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                          >
                            添加子女
                          </button>
                          <button
                            onClick={() => navigate(`/members/edit/${member.id}`)}
                            className="flex-1 py-2 text-center text-cinnabar-600 hover:bg-cinnabar-50 rounded-lg transition-colors text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="flex-1 py-2 text-center text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 桌面端表格 */}
            <div className="hidden sm:block ui-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 cursor-pointer hover:text-cinnabar-600" onClick={() => { setSortField('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        姓名 {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 cursor-pointer hover:text-cinnabar-600" onClick={() => { setSortField('generation'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        辈份 {sortField === 'generation' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">字辈</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 cursor-pointer hover:text-cinnabar-600" onClick={() => { setSortField('sibling_rank'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        同辈排行 {sortField === 'sibling_rank' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 cursor-pointer hover:text-cinnabar-600" onClick={() => { setSortField('family_rank'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        家庭排序 {sortField === 'family_rank' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">性别</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">配偶名字</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">子女数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">出生日期</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`ui-avatar w-8 h-8 text-sm ${getGenderColor(member.gender)}`}>
                              {member.name.slice(-1)}
                            </div>
                            <span className="font-medium text-slate-900">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-px bg-gilt-100 text-gilt-700 rounded text-[11px] font-medium">
                            第{member.generation}世
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-px bg-cinnabar-50 text-cinnabar-700 rounded text-[11px] font-medium">
                            {member.generation_char || '-'}字辈
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-px bg-jade-100 text-jade-700 rounded text-[11px] font-medium">
                            第{member.sibling_rank || 1}位
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-px bg-blue-100 text-blue-700 rounded text-[11px] font-medium">
                            第{member.family_rank || 1}位
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[11px] font-medium ${getGenderColor(member.gender)}`}>
                            {getGenderLabel(member.gender)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{member.spouse_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-px bg-blue-100 text-blue-700 rounded text-[11px] font-medium">
                            {memberChildrenCount[member.id] || 0}人
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{member.birth_date || '-'}</td>
                        <td className="px-4 py-3">
                          {/* 操作按钮 - 仅管理员可见 */}
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openBatchChildrenModal(member.id)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="添加子女"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/members/edit/${member.id}`)}
                                className="p-2 text-slate-500 hover:text-cinnabar-600 hover:bg-cinnabar-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(member.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-slate-500">暂无数据</div>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 批量添加子女弹窗 - 仅管理员可用 */}
      {isAdmin && (
        <BatchChildrenModal
          user={user}
          parentIds={selectedParentIds}
          isOpen={isBatchChildrenModalOpen}
          onClose={closeBatchChildrenModal}
          onSuccess={refresh}
        />
      )}
    </Layout>
  );
}
