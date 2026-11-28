export interface User {
  id: number;
  username: string;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  created_at?: string;
  password_change_required?: boolean;
}

export interface FamilyMember {
  id: number;
  user_id: number | null;
  name: string;
  gender: 'male' | 'female' | 'other' | null;
  birth_date: string | null;
  birth_calendar?: 'solar' | 'lunar' | null;
  birth_lunar_leap?: number | null;
  death_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  education: string | null;
  bio: string | null;
  notes: string | null;
  avatar_url: string | null;
  parent_id: number | null;
  spouse_name: string | null;
  spouse_origin: string | null;
  spouse_birth_date: string | null;
  spouse_birth_calendar?: 'solar' | 'lunar' | null;
  spouse_lunar_leap?: number | null;
  spouse_death_date: string | null;
  generation: number | null;
  generation_char: string | null;
  sibling_rank: number | null;
  family_rank: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GenerationChar {
  id: number;
  generation: number;
  char: string;
  hidden: boolean;
  created_at: string | null;
}

export interface TreeNode extends FamilyMember {
  children: TreeNode[];
  spouse?: FamilyMember;
}

export interface MemberFormData {
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  birth_date: string;
  birth_calendar: 'solar' | 'lunar';
  birth_lunar_leap: number;
  death_date: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  education: string;
  bio: string;
  parent_id: string;
  spouse_name: string;
  spouse_origin: string;
  spouse_birth_date: string;
  spouse_birth_calendar: 'solar' | 'lunar';
  spouse_lunar_leap: number;
  spouse_death_date: string;
  notes: string;
  generation: number;
  generation_char: string;
  sibling_rank: number;
  family_rank: number;
}
