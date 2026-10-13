/** 任用決策空間共用小元件：頭像、標示、按鈕 */
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Marker, MARKER_LABEL, Participant, RoleKey } from './hiringMock';

const AVATAR_TONE: Record<RoleKey, string> = {
  agent: 'bg-primary-light text-primary',
  hr: 'bg-blue-100 text-blue-700',
  interviewer: 'bg-secondary-light text-secondary',
  manager: 'bg-success-light text-success',
  decider: 'bg-dark-100 text-text-main',
};

export const Avatar: React.FC<{ person: Participant; size?: 'sm' | 'md'; ring?: boolean }> = ({ person, size = 'md', ring }) => {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm';
  return (
    <div
      className={`${dim} rounded-full shrink-0 flex items-center justify-center font-medium ${AVATAR_TONE[person.roleKey]} ${ring ? 'ring-2 ring-white' : ''}`}
      title={`${person.name}・${person.role}`}
    >
      {person.roleKey === 'agent' ? <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} /> : person.initial}
    </div>
  );
};

const MARKER_TONE: Record<Marker, string> = {
  agent: 'bg-primary-light text-blue-700 border-blue-200',
  pending: 'bg-warning-light text-text-main border-yellow-200',
  confirmed: 'bg-success-light text-success border-green-100',
};

const MARKER_DOT: Record<Marker, string> = {
  agent: 'bg-primary',
  pending: 'bg-warning',
  confirmed: 'bg-success',
};

export const MarkerBadge: React.FC<{ marker: Marker; label?: string }> = ({ marker, label }) => (
  <span className={`inline-flex items-center gap-1 h-5 px-2 rounded-sm border text-xs font-medium whitespace-nowrap ${MARKER_TONE[marker]}`}>
    <span className={`w-1 h-1 rounded-full ${MARKER_DOT[marker]}`} />
    {label ?? MARKER_LABEL[marker]}
  </span>
);

export const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}> = ({ label, onClick, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center hover:bg-neutral-border-light hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      active ? 'bg-neutral-border-light text-text-main' : 'text-text-sub'
    }`}
  >
    {children}
  </button>
);
