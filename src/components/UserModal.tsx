import React, { useState } from 'react';
import { UserProfile, Gender, ActivityLevel } from '../types';
import { StorageService } from '../services/storage';
import { X, Check, Calendar, Ruler, Target, Plus, Trash2, Users } from 'lucide-react';

interface UserModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onSave: (updated: UserProfile) => void;
}

export const UserModal: React.FC<UserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSelectUser,
  onSave
}) => {
  const [users, setUsers] = useState<UserProfile[]>(StorageService.getUsers());
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Formulário do usuário ativo ou novo
  const [name, setName] = useState(user.name);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [heightCm, setHeightCm] = useState(user.heightCm);
  const [birthDate, setBirthDate] = useState(user.birthDate);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(user.activityLevel);
  const [targetWeightKg, setTargetWeightKg] = useState(user.targetWeightKg || 70);

  if (!isOpen) return null;

  const handleSwitchUser = (selected: UserProfile) => {
    StorageService.setActiveUserId(selected.id);
    onSelectUser(selected);
    setName(selected.name);
    setGender(selected.gender);
    setHeightCm(selected.heightCm);
    setBirthDate(selected.birthDate);
    setActivityLevel(selected.activityLevel);
    setTargetWeightKg(selected.targetWeightKg || 70);
    setIsCreatingNew(false);
  };

  const handleStartCreateNew = () => {
    setName('Novo Familiar');
    setGender('male');
    setHeightCm(170);
    setBirthDate('1998-01-01');
    setActivityLevel('moderate');
    setTargetWeightKg(68);
    setIsCreatingNew(true);
  };

  const handleDeleteUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (users.length <= 1) return;
    const remaining = users.filter(u => u.id !== id);
    StorageService.saveUsers(remaining);
    setUsers(remaining);
    if (user.id === id) {
      handleSwitchUser(remaining[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      id: isCreatingNew ? `user-${Date.now()}` : user.id,
      name,
      gender,
      heightCm: Number(heightCm),
      birthDate,
      activityLevel,
      targetWeightKg: Number(targetWeightKg),
      createdAt: isCreatingNew ? new Date().toISOString() : user.createdAt
    };

    onSave(updated);
    setUsers(StorageService.getUsers());
    setIsCreatingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gerenciar Perfis</h2>
              <p className="text-xs text-slate-400">Alterne entre familiares ou edite biometrias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Perfis */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Perfis Cadastrados ({users.length})
            </span>
            <button
              onClick={handleStartCreateNew}
              className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Perfil
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => handleSwitchUser(u)}
                className={`cursor-pointer px-3 py-2 rounded-2xl border text-xs font-medium flex items-center gap-2 shrink-0 transition-all ${
                  u.id === user.id && !isCreatingNew
                    ? 'bg-brand-500/15 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span>{u.name}</span>
                {users.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteUser(u.id, e)}
                    title="Excluir perfil"
                    className="text-slate-500 hover:text-rose-400 p-0.5 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-slate-800/80 space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {isCreatingNew ? 'Cadastrar Novo Perfil' : `Editar Biometria de ${user.name}`}
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Sexo Biológico</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Altura (cm)</label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
                <Ruler className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data de Nascimento</label>
              <div className="relative">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-2 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Meta de Peso (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nível de Atividade</label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="sedentary">Sedentário (Pouco ou nenhum exercício)</option>
              <option value="moderate">Moderado (Exercício 2 a 4 vezes por semana)</option>
              <option value="active">Ativo (Exercício diário vigoroso)</option>
              <option value="athlete">Atleta de Alta Performance</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> {isCreatingNew ? 'Criar Perfil' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
