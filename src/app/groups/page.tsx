"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  PlusCircle,
  Clock,
  ShieldAlert,
  Layers,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface GroupCategory {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  categoryId: string;
  category: GroupCategory;
  description: string | null;
  platform: string;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  maxOffersPerHour: number;
  maxDailyOffers: number;
  minIntervalMinutes: number;
  isActive: boolean;
  inviteLink?: string | null;
  isVipRouter?: boolean;
  maxMembers?: number;
  currentClicks?: number;
  priority?: number;
  _count?: { publicationGroups: number };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [allowedHoursStart, setAllowedHoursStart] = useState("08:00");
  const [allowedHoursEnd, setAllowedHoursEnd] = useState("22:00");
  const [maxOffersPerHour, setMaxOffersPerHour] = useState("3");
  const [maxDailyOffers, setMaxDailyOffers] = useState("20");
  const [minIntervalMinutes, setMinIntervalMinutes] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [inviteLink, setInviteLink] = useState("");
  const [isVipRouter, setIsVipRouter] = useState(false);
  const [maxMembers, setMaxMembers] = useState("1000");
  const [priority, setPriority] = useState("1");

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const json = await res.json();
      if (json.success) {
        setGroups(json.data.groups);
        setCategories(json.data.categories);
        if (json.data.categories.length > 0 && !categoryId) {
          setCategoryId(json.data.categories[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openNewModal = () => {
    setEditingGroup(null);
    setName("");
    setDescription("");
    setAllowedHoursStart("08:00");
    setAllowedHoursEnd("22:00");
    setMaxOffersPerHour("3");
    setMaxDailyOffers("20");
    setMinIntervalMinutes("30");
    setIsActive(true);
    setInviteLink("");
    setIsVipRouter(false);
    setMaxMembers("1000");
    setPriority("1");
    setIsModalOpen(true);
  };

  const openEditModal = (g: Group) => {
    setEditingGroup(g);
    setName(g.name);
    setCategoryId(g.categoryId);
    setDescription(g.description || "");
    setAllowedHoursStart(g.allowedHoursStart);
    setAllowedHoursEnd(g.allowedHoursEnd);
    setMaxOffersPerHour(String(g.maxOffersPerHour));
    setMaxDailyOffers(String(g.maxDailyOffers));
    setMinIntervalMinutes(String(g.minIntervalMinutes));
    setIsActive(g.isActive);
    setInviteLink(g.inviteLink || "");
    setIsVipRouter(Boolean(g.isVipRouter));
    setMaxMembers(String(g.maxMembers || 1000));
    setPriority(String(g.priority || 1));
    setIsModalOpen(true);
  };

  const toggleGroupActive = async (id: string, currentState: boolean) => {
    try {
      await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentState }),
      });
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;
    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" });
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        categoryId,
        description,
        allowedHoursStart,
        allowedHoursEnd,
        maxOffersPerHour,
        maxDailyOffers,
        minIntervalMinutes,
        isActive,
        inviteLink: inviteLink || null,
        isVipRouter,
        maxMembers: Number(maxMembers),
        priority: Number(priority),
      };

      if (editingGroup) {
        await fetch(`/api/groups/${editingGroup.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gerenciamento de Grupos
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              {groups.length} canais
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure limites de envio, horários de operação e categorização dos seus grupos de afiliados.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Cadastrar Novo Grupo</span>
        </button>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                group.isActive ? "border-slate-200" : "border-slate-200/60 opacity-70 bg-slate-50/50"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                    {group.category?.name}
                  </span>
                  <button
                    onClick={() => toggleGroupActive(group.id, group.isActive)}
                    className="flex items-center gap-1"
                  >
                    {group.isActive ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="neutral">Inativo</Badge>
                    )}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}

                {group.isVipRouter && (
                  <div className="mt-2.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs">
                    <div className="flex items-center justify-between text-emerald-800 font-bold mb-1 text-[11px]">
                      <span>⭐ Roteador VIP (Prioridade #{group.priority || 1})</span>
                      <span>{group.currentClicks || 0} / {group.maxMembers || 1000}</span>
                    </div>
                    <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(((group.currentClicks || 0) / (group.maxMembers || 1000)) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Limits & Rules info block */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Horário permitido:</span>
                    <span className="font-semibold text-slate-900">
                      {group.allowedHoursStart} às {group.allowedHoursEnd}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Limite diário:</span>
                    <span className="font-semibold text-slate-900">
                      {group.maxDailyOffers} ofertas/dia
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Por hora:</span>
                    <span className="font-semibold text-slate-900">
                      {group.maxOffersPerHour} ofertas/hora
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Intervalo mínimo:</span>
                    <span className="font-semibold text-slate-900">
                      {group.minIntervalMinutes} minutos
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  {group._count?.publicationGroups || 0} envios registrados
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(group)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Editar"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição de Grupo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? "Editar Grupo" : "Cadastrar Novo Grupo"}
        description="Defina os limites de segurança para proteger seus grupos de spam e punições."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Grupo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: 🔥 Achados da Nanda - Geral VIP"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoria do Grupo *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Canal principal de promoções"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário Inicial Permitido
              </label>
              <input
                type="time"
                value={allowedHoursStart}
                onChange={(e) => setAllowedHoursStart(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horário Final Permitido
              </label>
              <input
                type="time"
                value={allowedHoursEnd}
                onChange={(e) => setAllowedHoursEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Limite por Hora
              </label>
              <input
                type="number"
                value={maxOffersPerHour}
                onChange={(e) => setMaxOffersPerHour(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                min={1}
                max={20}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Limite Diário
              </label>
              <input
                type="number"
                value={maxDailyOffers}
                onChange={(e) => setMaxDailyOffers(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intervalo Mín (min)
              </label>
              <input
                type="number"
                value={minIntervalMinutes}
                onChange={(e) => setMinIntervalMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                min={5}
                max={180}
              />
            </div>
          </div>

          {/* Configurações do Roteador VIP */}
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVipRouter"
                checked={isVipRouter}
                onChange={(e) => setIsVipRouter(e.target.checked)}
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="isVipRouter" className="text-xs font-bold text-rose-900">
                ⭐ Participa da Auto-Rotação do Link VIP (/vip)
              </label>
            </div>

            {isVipRouter && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link de Convite do WhatsApp (chat.whatsapp.com/...)
                  </label>
                  <input
                    type="url"
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Capacidade Máxima (Membros)
                    </label>
                    <input
                      type="number"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      placeholder="1000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      min={10}
                      max={1024}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prioridade da Fila (1 = primeiro)
                    </label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      min={1}
                      max={99}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700">
              Grupo ativo para receber publicações
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm"
            >
              Salvar Grupo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
