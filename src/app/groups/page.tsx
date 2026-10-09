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
  Tag,
  Send,
  Sparkles,
  CheckSquare,
  Square,
  FolderPlus,
  Play,
  Pause,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

interface GroupCategory {
  id: string;
  name: string;
  description?: string | null;
  _count?: { groups: number };
}

interface Group {
  id: string;
  name: string;
  categoryId: string;
  category: GroupCategory;
  description: string | null;
  platform: string;
  whatsappJid?: string | null;
  instanceName?: string | null;
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

  // Nicho Selecionado para Filtro
  const [selectedNicheId, setSelectedNicheId] = useState<string>("ALL");

  // Modal de Criação de Nicho
  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [newNicheName, setNewNicheName] = useState("");
  const [newNicheDesc, setNewNicheDesc] = useState("");
  const [savingNiche, setSavingNiche] = useState(false);

  // Seleção de Grupos para Envio em Lote
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isAssigningQueue, setIsAssigningQueue] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields de Grupo
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [whatsappJid, setWhatsappJid] = useState("");
  const [instanceName, setInstanceName] = useState("");
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchGroups = async () => {
    try {
      const [resGroups, resCats] = await Promise.all([
        fetch("/api/groups").then((r) => r.json()),
        fetch("/api/groups/categories").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (resGroups.success) {
        setGroups(resGroups.data.groups);
        if (resCats.success && Array.isArray(resCats.data)) {
          setCategories(resCats.data);
        } else {
          setCategories(resGroups.data.categories);
        }

        if (resGroups.data.categories.length > 0 && !categoryId) {
          setCategoryId(resGroups.data.categories[0].id);
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

  // Multi-Seleção
  const toggleSelectGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllNiche = (currentList: Group[]) => {
    if (selectedGroupIds.size === currentList.length && currentList.length > 0) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(currentList.map((g) => g.id)));
    }
  };

  // Vincular grupos selecionados à fila de publicações
  const handleAssignToQueue = async () => {
    if (selectedGroupIds.size === 0) return;
    setIsAssigningQueue(true);

    try {
      const res = await fetch("/api/groups/assign-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: Array.from(selectedGroupIds) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 ${data.message}`);
      } else {
        showToast(`❌ Erro: ${data.error || "Falha ao vincular grupos"}`);
      }
    } catch (err) {
      showToast("❌ Erro de conexão ao vincular grupos.");
    } finally {
      setIsAssigningQueue(false);
    }
  };

  // Criar novo Nicho
  const handleCreateNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNicheName.trim()) return;

    setSavingNiche(true);
    try {
      const res = await fetch("/api/groups/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newNicheName.trim(),
          description: newNicheDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ Nicho "${newNicheName}" criado com sucesso!`);
        setNewNicheName("");
        setNewNicheDesc("");
        setIsNicheModalOpen(false);
        fetchGroups();
        if (data.data?.id) setSelectedNicheId(data.data.id);
      } else {
        showToast(`❌ Erro: ${data.error}`);
      }
    } catch (err) {
      showToast("❌ Erro ao criar nicho.");
    } finally {
      setSavingNiche(false);
    }
  };

  const openNewModal = () => {
    setEditingGroup(null);
    setName("");
    setDescription("");
    setWhatsappJid("");
    setInstanceName("");
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
    if (selectedNicheId !== "ALL") {
      setCategoryId(selectedNicheId);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (g: Group) => {
    setEditingGroup(g);
    setName(g.name);
    setCategoryId(g.categoryId);
    setDescription(g.description || "");
    setWhatsappJid(g.whatsappJid || "");
    setInstanceName(g.instanceName || "");
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
      showToast("🗑️ Grupo removido.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        categoryId,
        description,
        whatsappJid: whatsappJid || null,
        instanceName: instanceName || null,
        allowedHoursStart,
        allowedHoursEnd,
        maxOffersPerHour: Number(maxOffersPerHour),
        maxDailyOffers: Number(maxDailyOffers),
        minIntervalMinutes: Number(minIntervalMinutes),
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
        showToast("✅ Grupo atualizado com sucesso!");
      } else {
        await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showToast("🎉 Novo grupo cadastrado!");
      }

      setIsModalOpen(false);
      fetchGroups();
    } catch (err) {
      console.error(err);
      showToast("❌ Erro ao salvar grupo.");
    }
  };

  // Filtragem dos grupos pelo nicho selecionado
  const displayedGroups = groups.filter((g) => {
    if (selectedNicheId === "ALL") return true;
    return g.categoryId === selectedNicheId;
  });

  const selectedNicheObj = categories.find((c) => c.id === selectedNicheId);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Grupos & Nichos
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              {groups.length} canais cadastrados
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize seus grupos por nicho, selecione quais devem receber as ofertas e defina regras anti-bloqueio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Novo Nicho */}
          <button
            onClick={() => setIsNicheModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <FolderPlus className="h-4 w-4 text-rose-600" />
            <span>+ Criar Novo Nicho</span>
          </button>

          {/* Botão Novo Grupo */}
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Cadastrar Novo Grupo</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE NICHOS (CATEGORIAS) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Escolha o Nicho para filtrar e gerenciar:
          </span>
          <span className="text-xs text-slate-400">
            {categories.length} nichos disponíveis
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {/* Aba Todos */}
          <button
            onClick={() => setSelectedNicheId("ALL")}
            className={`rounded-xl px-4 py-2 font-bold transition-all shrink-0 flex items-center gap-2 ${
              selectedNicheId === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>✨ Todos os Grupos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedNicheId === "ALL" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
              {groups.length}
            </span>
          </button>

          {/* Abas dos Nichos */}
          {categories.map((cat) => {
            const countInNiche = groups.filter((g) => g.categoryId === cat.id).length;
            const isSelected = selectedNicheId === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedNicheId(cat.id)}
                className={`rounded-xl px-4 py-2 font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>🏷️ {cat.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {countInNiche}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRA DE AÇÃO EM LOTE PARA GRUPOS SELECIONADOS */}
      {displayedGroups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={
                  selectedGroupIds.size === displayedGroups.length && displayedGroups.length > 0
                }
                onChange={() => toggleSelectAllNiche(displayedGroups)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>
                {selectedGroupIds.size === 0
                  ? `Selecionar todos (${displayedGroups.length} no nicho)`
                  : `${selectedGroupIds.size} de ${displayedGroups.length} grupo(s) selecionado(s)`}
              </span>
            </label>

            {selectedGroupIds.size > 0 && (
              <button
                onClick={() => setSelectedGroupIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Desmarcar todos
              </button>
            )}
          </div>

          {selectedGroupIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAssignToQueue}
                disabled={isAssigningQueue}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
                title="Define estes grupos como destino das ofertas da fila"
              >
                <Send className="h-4 w-4" />
                <span>
                  {isAssigningQueue
                    ? "Vinculando..."
                    : `🚀 Enviar Fila para Selecionados (${selectedGroupIds.size})`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Groups Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        </div>
      ) : displayedGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Nenhum grupo cadastrado neste nicho
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {selectedNicheObj
              ? `Ainda não há grupos vinculados ao nicho "${selectedNicheObj.name}". Cadastre seu primeiro grupo agora.`
              : "Cadastre novos grupos e organize-os por nichos para automatizar os disparos."}
          </p>
          <button
            onClick={openNewModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Cadastrar Primeiro Grupo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGroups.map((group) => {
            const isSelected = selectedGroupIds.has(group.id);

            return (
              <div
                key={group.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-400/40"
                    : group.isActive
                    ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    : "border-slate-200/60 opacity-70 bg-slate-50/50"
                }`}
              >
                <div>
                  {/* Header do Card com Checkbox de Seleção */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectGroup(group.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Selecionar este grupo para envio"
                      />
                      <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {group.category?.name}
                      </span>
                    </div>

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
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((group.currentClicks || 0) / (group.maxMembers || 1000)) * 100
                              )
                            )}%`,
                          }}
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
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Nicho */}
      <Modal
        isOpen={isNicheModalOpen}
        onClose={() => setIsNicheModalOpen(false)}
        title="Criar Novo Nicho"
        description="Agrupe seus canais por segmento (ex: Moda & Beleza, Casa & Cozinha, Tech, Bebê)."
      >
        <form onSubmit={handleCreateNiche} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Nicho *
            </label>
            <input
              type="text"
              value={newNicheName}
              onChange={(e) => setNewNicheName(e.target.value)}
              placeholder="Ex: 👗 Moda & Beleza, 💻 Tecnologia & Setup"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={newNicheDesc}
              onChange={(e) => setNewNicheDesc(e.target.value)}
              placeholder="Ex: Grupos focados em vestuário feminino, sapatos e cosméticos"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNicheModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingNiche}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-sm disabled:opacity-50"
            >
              {savingNiche ? "Salvando..." : "Salvar Nicho"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Criação / Edição de Grupo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? "Editar Grupo" : "Cadastrar Novo Grupo"}
        description="Defina os limites de segurança para proteger seus grupos de spam e punições."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
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
              Nicho / Categoria do Grupo *
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
                WhatsApp JID (opcional p/ API)
              </label>
              <input
                type="text"
                value={whatsappJid}
                onChange={(e) => setWhatsappJid(e.target.value)}
                placeholder="12036302...@g.us"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instância / Chip (opcional)
              </label>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="nanda-moda"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>
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
