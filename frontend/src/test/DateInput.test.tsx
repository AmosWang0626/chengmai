import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DateInput from '../components/DateInput';

const Controlled = ({ initial = '', onChange }: { initial?: string; onChange?: (value: string) => void }) => {
  const [value, setValue] = useState(initial);
  return <DateInput value={value} ariaLabel="出生日期" onChange={next => { setValue(next); onChange?.(next); }} />;
};

describe('DateInput', () => {
  it('normalizes manually typed dates on blur', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByLabelText('出生日期');

    fireEvent.change(input, { target: { value: '1900/1/2' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('1900-01-02');
    expect(input).toHaveValue('1900-01-02');
  });

  it('selects historical dates through year, month and day controls', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '选择出生日期' }));
    fireEvent.change(screen.getByLabelText('年'), { target: { value: '1888' } });
    fireEvent.change(screen.getByLabelText('月'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('日'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: '确定' }));

    expect(onChange).toHaveBeenCalledWith('1888-03-15');
    expect(screen.getByLabelText('出生日期')).toHaveValue('1888-03-15');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rejects invalid dates and clears existing values', () => {
    const onChange = vi.fn();
    render(<Controlled initial="1900-01-01" onChange={onChange} />);
    const input = screen.getByLabelText('出生日期');

    fireEvent.change(input, { target: { value: '1900-02-30' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('1900-01-01');
    expect(screen.getByText('日期格式应为 YYYY-MM-DD')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '选择出生日期' }));
    fireEvent.click(screen.getByRole('button', { name: '清除' }));
    expect(onChange).toHaveBeenCalledWith('');
    expect(input).toHaveValue('');
  });
});
