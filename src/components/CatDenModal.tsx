import React, { useState } from 'react';
import type { CollarId, SaveData, SkillId } from '../core/save';
import {
  ACHIEVEMENT_ORDER,
  COLLAR_CATALOG,
  SKILL_CATALOG,
} from '../systems/progression';
import type { CampaignLocale } from '../data/campaignI18n';
import { CornerFiligree } from './CornerFiligree';

interface CatDenModalProps {
  save: SaveData;
  campaignLocale: CampaignLocale;
  onBuySkill: (id: SkillId) => void;
  onCollarAction: (id: CollarId) => void;
  onClose: () => void;
}

export const CatDenModal: React.FC<CatDenModalProps> = ({
  save,
  campaignLocale,
  onBuySkill,
  onCollarAction,
  onClose,
}) => {
  const [tab, setTab] = useState<'skills' | 'collars' | 'trophies'>('skills');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={campaignLocale.den.title}
      data-testid="cat-den-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0D1619]/82 p-4 sm:p-6 overflow-y-auto"
    >
      <div className="luxury-panel-sheen modal-panel-enter relative w-full max-w-lg bg-[#121C20] border border-[#F4A949]/80 p-5 sm:p-6 space-y-4 shadow-2xl">
        <CornerFiligree />
        <div className="flex items-start justify-between gap-3 border-b border-[#8F5E46]/45 pb-3">
          <div>
            <h2
              className="text-xl sm:text-2xl font-semibold text-[#F7EEDC]"
              style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif" }}
            >
              {campaignLocale.den.title}
            </h2>
            <p className="text-xs font-mono text-[#F4A949] mt-1">
              {campaignLocale.den.fishBalance}:{' '}
              <strong data-testid="den-fish-balance">{save.fishBank} 🐟</strong>
            </p>
          </div>
          <button
            type="button"
            data-testid="den-close-btn"
            onClick={onClose}
            className="px-3 py-1.5 bg-[#1A282D] hover:bg-[#26353B] border border-[#8F5E46]/70 text-xs font-mono text-[#EFE6D5] cursor-pointer"
          >
            {campaignLocale.den.closeBtn}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['skills', campaignLocale.den.tabSkills],
              ['collars', campaignLocale.den.tabCollars],
              ['trophies', `${campaignLocale.den.tabAchievements} (${save.unlockedAchievements.length}/${ACHIEVEMENT_ORDER.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-testid={`den-tab-${key}`}
              onClick={() => setTab(key)}
              className={`py-1.5 px-2 text-xs font-mono border cursor-pointer truncate ${
                tab === key
                  ? 'brass-shimmer bg-[#F4A949] border-[#FFD5A5] text-[#142024] font-semibold'
                  : 'bg-[#1A282D] border-[#8F5E46]/50 text-[#DCE5E2] hover:border-[#F4A949]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Skills Tab */}
        {tab === 'skills' && (
          <div className="space-y-2.5">
            {SKILL_CATALOG.map((sk) => {
              const owned = save.unlockedSkills.includes(sk.id);
              const affordable = save.fishBank >= sk.cost;
              const info = campaignLocale.skills[sk.id];
              return (
                <div
                  key={sk.id}
                  className="flex items-center justify-between gap-3 bg-[#1A282D] border border-[#8F5E46]/45 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F7EEDC] flex items-center gap-2">
                      <span>{sk.icon}</span>
                      <span>{info.name}</span>
                    </div>
                    <p className="text-xs text-[#9EB4AD] mt-0.5">{info.desc}</p>
                  </div>
                  <button
                    type="button"
                    data-testid={`buy-skill-${sk.id}`}
                    disabled={owned || !affordable}
                    onClick={() => onBuySkill(sk.id)}
                    className={`shrink-0 px-3 py-1.5 text-xs font-mono border ${
                      owned
                        ? 'bg-[#1D3B34] border-[#4CE0B3]/70 text-[#8FE8CF] cursor-default'
                        : affordable
                          ? 'brass-shimmer bg-[#F4A949] hover:bg-[#FFD5A5] border-[#FFD5A5] text-[#142024] font-semibold cursor-pointer'
                          : 'bg-[#141F23] border-[#8F5E46]/35 text-[#6D817C] cursor-not-allowed'
                    }`}
                  >
                    {owned ? campaignLocale.den.owned : `${campaignLocale.den.buyBtn} (${sk.cost} 🐟)`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Collars Tab */}
        {tab === 'collars' && (
          <div className="space-y-2.5">
            {COLLAR_CATALOG.map((col) => {
              const owned = save.unlockedCollars.includes(col.id);
              const equipped = save.equippedCollar === col.id;
              const affordable = save.fishBank >= col.cost;
              const info = campaignLocale.collars[col.id];
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between gap-3 bg-[#1A282D] border border-[#8F5E46]/45 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex items-start gap-2.5">
                    <span
                      className="w-3.5 h-3.5 mt-1 shrink-0 border border-[#F7EEDC]/50"
                      style={{ backgroundColor: col.accentHex }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#F7EEDC]">{info.name}</div>
                      <p className="text-xs text-[#9EB4AD] mt-0.5">{info.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid={`collar-btn-${col.id}`}
                    disabled={equipped || (!owned && !affordable)}
                    onClick={() => onCollarAction(col.id)}
                    className={`shrink-0 px-3 py-1.5 text-xs font-mono border ${
                      equipped
                        ? 'bg-[#1D3B34] border-[#4CE0B3] text-[#8FE8CF] cursor-default'
                        : owned
                          ? 'bg-[#2B3D38] hover:bg-[#3F7D70] border-[#8FE8CF]/70 text-[#F7EEDC] cursor-pointer'
                          : affordable
                            ? 'bg-[#F4A949] hover:bg-[#FFD5A5] border-[#FFD5A5] text-[#142024] font-semibold cursor-pointer'
                            : 'bg-[#141F23] border-[#8F5E46]/35 text-[#6D817C] cursor-not-allowed'
                    }`}
                  >
                    {equipped
                      ? campaignLocale.den.equipped
                      : owned
                        ? campaignLocale.den.equipBtn
                        : `${campaignLocale.den.buyBtn} (${col.cost} 🐟)`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Achievements Tab */}
        {tab === 'trophies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {ACHIEVEMENT_ORDER.map((achId) => {
              const unlocked = save.unlockedAchievements.includes(achId);
              const info = campaignLocale.achievements[achId];
              return (
                <div
                  key={achId}
                  className={`px-3 py-2 border ${
                    unlocked
                      ? 'bg-[#1D322D] border-[#F4A949]/75 text-[#F7EEDC]'
                      : 'bg-[#152024] border-[#8F5E46]/30 text-[#6D817C]'
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>{unlocked ? '★' : '☆'}</span>
                    <span>{info.name}</span>
                  </div>
                  <p className="text-[11px] opacity-85 mt-0.5">{info.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
