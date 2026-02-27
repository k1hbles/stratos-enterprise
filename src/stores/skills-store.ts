import { create } from "zustand";

interface Skill {
  id: string;
  name: string;
  icon: string;
}

interface SkillsState {
  activeSkills: Skill[];
  activateSkill: (skill: Skill) => void;
  deactivateSkill: (id: string) => void;
}

export const useSkillsStore = create<SkillsState>((set) => ({
  activeSkills: [],
  activateSkill: (skill) =>
    set((state) => ({
      activeSkills: state.activeSkills.some((s) => s.id === skill.id)
        ? state.activeSkills
        : [...state.activeSkills, skill],
    })),
  deactivateSkill: (id) =>
    set((state) => ({
      activeSkills: state.activeSkills.filter((s) => s.id !== id),
    })),
}));
