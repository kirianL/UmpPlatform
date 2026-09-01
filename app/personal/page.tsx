"use client";

import {
  CheckCircleIcon,
  FilmStripIcon,
  IdentificationCardIcon,
  ImageSquareIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
  UserCheckIcon,
  UsersIcon,
  UserPlusIcon,
  PhoneIcon,
  CakeIcon,
  GiftIcon,
  CalendarBlankIcon,
  SparkleIcon,
  HandshakeIcon,
  ArrowSquareOutIcon,
  EnvelopeSimpleIcon,
  GlobeIcon,
  FunnelIcon,
  BroomIcon,
  AddressBookIcon,
  BuildingsIcon,
  TagIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useState, useMemo } from "react";
import Badge from "@/components/public/Badge";
import Button from "@/components/public/Button";

import ConfirmModal from "@/components/public/ConfirmModal";
import DataTable, { type Column } from "@/components/public/DataTable";

import EmptyState from "@/components/public/EmptyState";
import Input from "@/components/public/Input";
import Modal from "@/components/public/Modal";
import Select from "@/components/public/Select";
import StatCard from "@/components/public/StatCard";
import PageContainer from "@/components/public/PageContainer";
import { Tabs } from "@/components/public/Tabs";
import { useAuth } from "@/components/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/helpers/classname-helper";

function formatCurrency(n: number): string {
  const formatted = new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 0,
  }).format(n);
  return `₡ ${formatted}`;
}

function formatDate(iso: string): string {
  if (!iso) return "N/A";
  const dateStr = iso.slice(0, 10);
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "N/A";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface BirthdayInfo {
  birthDateFormatted: string;
  dayMonthFormatted: string;
  currentAge: number | null;
  turningAge: number | null;
  daysRemaining: number;
  isToday: boolean;
  isSoon: boolean;
  badgeText: string;
  detailText: string;
  badgeVariant: "gold" | "orange" | "sky" | "gray";
}

export function getBirthdayInfo(birthDateStr?: string): BirthdayInfo | null {
  if (!birthDateStr) return null;
  const cleanStr = birthDateStr.slice(0, 10);
  const parts = cleanStr.split("-");
  if (parts.length !== 3) return null;

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);

  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;

  const MONTH_NAMES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const monthName = MONTH_NAMES[birthMonth] || "";
  const dayMonthFormatted = `${birthDay} de ${monthName}`;
  const birthDateFormatted = `${birthDay} de ${monthName} de ${birthYear}`;

  const today = new Date();
  const currentYear = today.getFullYear();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const thisYearBirthday = new Date(currentYear, birthMonth, birthDay);

  let nextBirthday = new Date(currentYear, birthMonth, birthDay);
  let turningAge = currentYear - birthYear;

  if (todayMidnight.getTime() > thisYearBirthday.getTime()) {
    nextBirthday = new Date(currentYear + 1, birthMonth, birthDay);
    turningAge = currentYear + 1 - birthYear;
  }

  let currentAge = currentYear - birthYear;
  if (todayMidnight.getTime() < thisYearBirthday.getTime()) {
    currentAge -= 1;
  }

  const diffMs = nextBirthday.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isToday = daysRemaining === 0;
  const isSoon = daysRemaining <= 30;

  let badgeText = "";
  let detailText = "";
  let badgeVariant: "gold" | "orange" | "sky" | "gray" = "gray";

  if (isToday) {
    badgeText = "Cumpleaños hoy";
    detailText = `Cumple ${currentAge} años hoy`;
    badgeVariant = "gold";
  } else if (daysRemaining === 1) {
    badgeText = "Mañana";
    detailText = `Cumple ${turningAge} años mañana`;
    badgeVariant = "orange";
  } else if (daysRemaining <= 7) {
    badgeText = `En ${daysRemaining} días`;
    detailText = `Faltan ${daysRemaining} días (${dayMonthFormatted})`;
    badgeVariant = "orange";
  } else if (daysRemaining <= 30) {
    badgeText = `En ${daysRemaining} días`;
    detailText = `Faltan ${daysRemaining} días (${dayMonthFormatted})`;
    badgeVariant = "sky";
  } else {
    const months = Math.floor(daysRemaining / 30.4375);
    const remDays = Math.round(daysRemaining - months * 30.4375);
    let timeStr = "";
    if (months > 0 && remDays > 0) {
      timeStr = `${months} m y ${remDays} d`;
    } else if (months > 0) {
      timeStr = `${months} ${months === 1 ? "mes" : "meses"}`;
    } else {
      timeStr = `${daysRemaining} días`;
    }
    badgeText = `En ${timeStr}`;
    detailText = `Faltan ${timeStr} (${dayMonthFormatted})`;
    badgeVariant = "gray";
  }

  return {
    birthDateFormatted,
    dayMonthFormatted,
    currentAge,
    turningAge,
    daysRemaining,
    isToday,
    isSoon,
    badgeText,
    detailText,
    badgeVariant,
  };
}

function getWhatsAppLink(phone: string): string {
  if (!phone) return "#";
  let cleanNumber = phone.replace(/[^\d]/g, "");
  if (cleanNumber.length === 8) {
    cleanNumber = `506${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}`;
}

function getSocialUrl(link?: string): string {
  if (!link) return "#";
  const trimmed = link.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }
  return `https://${trimmed}`;
}

function compressImage(
  file: File,
  maxWidth = 600,
  maxHeight = 800,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const EMPTY_EMPLOYEE = {
  name: "",
  role: "",
  phone: "",
  email: "",
  salary: 0,
  status: "active" as const,
  episodeCount: 0,
  birthDate: "",
};

const EMPTY_ACTOR = {
  name: "",
  characterName: "",
  characterBio: "",
  photoUrl: "",
  phone: "",
  email: "",
  status: "active" as const,
  episodeCount: 0,
  birthDate: "",
};

const EMPTY_LEAD = {
  name: "",
  phone: "",
  email: "",
  description: "",
  status: "nuevo" as "nuevo" | "contactado" | "evaluado" | "descartado",
  birthDate: "",
  photoUrl: "",
};

const EMPTY_COLLABORATOR = {
  name: "",
  area: "",
  phone: "",
  email: "",
  socialLink: "",
  description: "",
  status: "por_contactar" as
    | "por_contactar"
    | "en_conversacion"
    | "confirmado"
    | "descartado",
  birthDate: "",
  photoUrl: "",
};

const EMPTY_POTENTIAL_CONTACT = {
  name: "",
  category: "",
  organization: "",
  phone: "",
  email: "",
  socialLink: "",
  description: "",
  status: "nuevo" as
    | "nuevo"
    | "en_seguimiento"
    | "contactado"
    | "convertido"
    | "descartado",
  birthDate: "",
  photoUrl: "",
};

export default function PersonalPage() {
  const { userRole, userEmail } = useAuth();
  const isMichelle = (userEmail || "").toLowerCase().includes("michelle");
  const canViewStaff =
    userRole !== "actores" && userRole !== "directorio" && !isMichelle;

  // Employees (Staff)
  const employees = useQuery(api.employees.get) ?? [];
  const createEmployee = useMutation(api.employees.create);
  const updateEmployee = useMutation(api.employees.update);
  const removeEmployee = useMutation(api.employees.remove);

  // Actors
  const actors = useQuery(api.actors.get) ?? [];
  const createActor = useMutation(api.actors.create);
  const updateActor = useMutation(api.actors.update);
  const removeActor = useMutation(api.actors.remove);

  // Interested persons for recording (Casting leads)
  const castingLeads = useQuery(api.castingLeads.get) ?? [];
  const createCastingLead = useMutation(api.castingLeads.create);
  const updateCastingLead = useMutation(api.castingLeads.update);
  const removeCastingLead = useMutation(api.castingLeads.remove);
  const cleanCastingDuplicates = useMutation(api.castingLeads.cleanDuplicates);

  // Potential Collaborators
  const potentialCollaborators = useQuery(api.potentialCollaborators.get) ?? [];
  const createCollaborator = useMutation(api.potentialCollaborators.create);
  const updateCollaborator = useMutation(api.potentialCollaborators.update);
  const removeCollaborator = useMutation(api.potentialCollaborators.remove);

  // Potential Contacts
  const potentialContacts = useQuery(api.potentialContacts.get) ?? [];
  const createPotentialContact = useMutation(api.potentialContacts.create);
  const updatePotentialContact = useMutation(api.potentialContacts.update);
  const removePotentialContact = useMutation(api.potentialContacts.remove);

  const [search, setSearch] = useState("");
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);
  const [isSubmittingActor, setIsSubmittingActor] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [isSubmittingCollab, setIsSubmittingCollab] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Duplicate leads count
  const duplicateLeadsCount = useMemo(() => {
    const names = castingLeads
      .map((l: any) => (l.name || "").trim().toLowerCase())
      .filter(Boolean);
    const uniqueNames = new Set(names);
    return names.length - uniqueNames.size;
  }, [castingLeads]);

  // Employee Modal State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE);

  // Actor Modal State
  const [actorModalOpen, setActorModalOpen] = useState(false);
  const [editingActorId, setEditingActorId] = useState<string | null>(null);
  const [actorForm, setActorForm] = useState(EMPTY_ACTOR);

  // Casting Lead Modal State
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD);
  const [previewLeadPhoto, setPreviewLeadPhoto] = useState<{
    url: string;
    name: string;
    phone?: string;
    description?: string;
  } | null>(null);

  // Potential Collaborator Modal State
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [collabToDeleteId, setCollabToDeleteId] = useState<string | null>(null);
  const [collabForm, setCollabForm] = useState(EMPTY_COLLABORATOR);
  const [collabStatusFilter, setCollabStatusFilter] = useState<string>("all");

  // Potential Contact Modal State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactToDeleteId, setContactToDeleteId] = useState<string | null>(
    null,
  );
  const [contactForm, setContactForm] = useState(EMPTY_POTENTIAL_CONTACT);
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");
  const [contactCategoryFilter, setContactCategoryFilter] =
    useState<string>("all");

  // Ficha Personaje Modal State
  const [selectedFichaActor, setSelectedFichaActor] = useState<any | null>(
    null,
  );
  const [fichaModalOpen, setFichaModalOpen] = useState(false);

  // Staff Filters
  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()),
  );

  // Actors Filters
  const filteredActors = actors.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.characterName.toLowerCase().includes(search.toLowerCase()) ||
      (a.characterBio &&
        a.characterBio.toLowerCase().includes(search.toLowerCase())),
  );

  // Casting Leads Filters
  const filteredLeads = castingLeads.filter(
    (l: any) =>
      (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone && l.phone.toLowerCase().includes(search.toLowerCase())) ||
      (l.description &&
        l.description.toLowerCase().includes(search.toLowerCase())),
  );

  // Potential Collaborators Filters
  const filteredCollaborators = potentialCollaborators.filter((c: any) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.area && c.area.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.socialLink &&
        c.socialLink.toLowerCase().includes(search.toLowerCase())) ||
      (c.description &&
        c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      collabStatusFilter === "all" || c.status === collabStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Potential Contacts Filters
  const filteredContacts = potentialContacts.filter((c: any) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(search.toLowerCase())) ||
      (c.organization &&
        c.organization.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.socialLink &&
        c.socialLink.toLowerCase().includes(search.toLowerCase())) ||
      (c.description &&
        c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      contactStatusFilter === "all" || c.status === contactStatusFilter;

    const matchesCategory =
      contactCategoryFilter === "all" || c.category === contactCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const activeEmpCount = employees.filter((e) => e.status === "active").length;
  const activeActorCount = actors.filter((a) => a.status === "active").length;
  const activeCollabCount = potentialCollaborators.filter(
    (c) => c.status === "confirmado",
  ).length;
  const activeContactCount = potentialContacts.filter(
    (c: any) =>
      c.status === "convertido" ||
      c.status === "contactado" ||
      c.status === "en_seguimiento",
  ).length;

  // Staff Form Handlers
  function openCreateEmp() {
    setEditingEmpId(null);
    setEmpForm(EMPTY_EMPLOYEE);
    setEmpModalOpen(true);
  }

  function openEditEmp(e: any) {
    setEditingEmpId(e._id);
    setEmpForm({
      name: e.name,
      role: e.role,
      phone: e.phone,
      email: e.email,
      salary: e.salary,
      status: e.status,
      episodeCount: e.episodeCount,
      birthDate: e.birthDate || "",
    });
    setEmpModalOpen(true);
  }

  async function handleSaveEmp() {
    if (isSubmittingEmp) return;
    setIsSubmittingEmp(true);
    const name = empForm.name.trim() || "Empleado sin nombre";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const payload = {
      ...empForm,
      name,
      role: empForm.role.trim() || "Sin rol especificado",
      avatarInitials: initials,
      birthDate: empForm.birthDate.trim() || undefined,
    };

    try {
      if (editingEmpId && !editingEmpId.startsWith("synthetic-")) {
        await updateEmployee({
          id: editingEmpId as any,
          ...payload,
        });
      } else {
        await createEmployee(payload);
      }
      setEmpModalOpen(false);
    } catch (err) {
      console.error("Error al guardar empleado:", err);
    } finally {
      setIsSubmittingEmp(false);
    }
  }

  // Actor Form Handlers
  function openCreateActor() {
    setEditingActorId(null);
    setActorForm(EMPTY_ACTOR);
    setActorModalOpen(true);
  }

  function openEditActor(a: any) {
    setEditingActorId(a._id);
    setActorForm({
      name: a.name,
      characterName: a.characterName,
      characterBio: a.characterBio || "",
      photoUrl: a.photoUrl || "",
      phone: a.phone || "",
      email: a.email || "",
      status: a.status || "active",
      episodeCount: a.episodeCount || 0,
      birthDate: a.birthDate || "",
    });
    setActorModalOpen(true);
  }

  const [copiedLinkActorId, setCopiedLinkActorId] = useState<string | null>(
    null,
  );

  function copyActorPublicLink(actorName: string, id: string) {
    const actorObj = actors.find((a) => a._id === id || a.name === actorName);
    const targetName = actorObj?.name || actorName;
    const slug =
      targetName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      actorObj?.shareToken ||
      "general";
    const url = `${window.location.origin}/calendario-actores/public/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkActorId(id);
    setTimeout(() => setCopiedLinkActorId(null), 2500);
  }

  async function handleSaveActor() {
    if (isSubmittingActor) return;
    setIsSubmittingActor(true);
    const actorName = actorForm.name.trim() || "Actor sin nombre";
    const shareToken = actorName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const payload = {
      ...actorForm,
      name: actorName,
      characterName: actorForm.characterName.trim() || "Personaje sin nombre",
      shareToken,
      birthDate: actorForm.birthDate.trim() || undefined,
    };

    try {
      if (editingActorId && !editingActorId.startsWith("synthetic-")) {
        await updateActor({
          id: editingActorId as any,
          ...payload,
        });
      } else {
        await createActor(payload);
      }
      setActorModalOpen(false);
    } catch (err) {
      console.error("Error al guardar actor:", err);
    } finally {
      setIsSubmittingActor(false);
    }
  }

  // Casting Lead Form Handlers
  function openCreateLead() {
    setEditingLeadId(null);
    setLeadForm(EMPTY_LEAD);
    setLeadModalOpen(true);
  }

  function openEditLead(lead: any) {
    setEditingLeadId(lead._id);
    setLeadForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email || "",
      description: lead.description || "",
      status: lead.status || "nuevo",
      birthDate: lead.birthDate || "",
      photoUrl: lead.photoUrl || "",
    });
    setLeadModalOpen(true);
  }

  async function handleSaveLead() {
    if (isSubmittingLead) return;
    setIsSubmittingLead(true);
    try {
      const payload = {
        name: leadForm.name.trim() || "Persona interesada",
        phone: leadForm.phone.trim() || undefined,
        email: leadForm.email.trim() || undefined,
        description: leadForm.description.trim() || undefined,
        status: leadForm.status,
        birthDate: leadForm.birthDate.trim() || undefined,
        photoUrl: leadForm.photoUrl.trim() || undefined,
      };

      if (editingLeadId) {
        await updateCastingLead({
          id: editingLeadId as any,
          ...payload,
        });
      } else {
        await createCastingLead(payload);
      }
      setLeadModalOpen(false);
    } catch (err) {
      console.error("Error al guardar interesado:", err);
    } finally {
      setIsSubmittingLead(false);
    }
  }

  async function handleCleanDuplicates() {
    if (isCleaningDuplicates) return;
    setIsCleaningDuplicates(true);
    try {
      await cleanCastingDuplicates();
    } catch (err) {
      console.error("Error al limpiar duplicados:", err);
    } finally {
      setIsCleaningDuplicates(false);
    }
  }

  function handleDeleteLead(id: string) {
    setLeadToDeleteId(id);
  }

  // Potential Collaborators Form Handlers
  function openCreateCollab() {
    setEditingCollabId(null);
    setCollabForm(EMPTY_COLLABORATOR);
    setCollabModalOpen(true);
  }

  function openEditCollab(collab: any) {
    setEditingCollabId(collab._id);
    setCollabForm({
      name: collab.name || "",
      area: collab.area || "",
      phone: collab.phone || "",
      email: collab.email || "",
      socialLink: collab.socialLink || "",
      description: collab.description || "",
      status: collab.status || "por_contactar",
      birthDate: collab.birthDate || "",
      photoUrl: collab.photoUrl || "",
    });
    setCollabModalOpen(true);
  }

  async function handleSaveCollab() {
    if (isSubmittingCollab) return;
    const name = collabForm.name.trim();
    if (!name) return;
    setIsSubmittingCollab(true);

    try {
      const payload = {
        name,
        area: collabForm.area.trim() || undefined,
        phone: collabForm.phone.trim() || undefined,
        email: collabForm.email.trim() || undefined,
        socialLink: collabForm.socialLink.trim() || undefined,
        description: collabForm.description.trim() || undefined,
        status: collabForm.status,
        birthDate: collabForm.birthDate.trim() || undefined,
        photoUrl: collabForm.photoUrl.trim() || undefined,
      };

      if (editingCollabId) {
        await updateCollaborator({
          id: editingCollabId as any,
          ...payload,
        });
      } else {
        await createCollaborator(payload);
      }
      setCollabModalOpen(false);
    } catch (err) {
      console.error("Error al guardar colaborador:", err);
    } finally {
      setIsSubmittingCollab(false);
    }
  }

  function handleDeleteCollab(id: string) {
    setCollabToDeleteId(id);
  }

  // Potential Contacts Form Handlers
  function openCreateContact() {
    setEditingContactId(null);
    setContactForm(EMPTY_POTENTIAL_CONTACT);
    setContactModalOpen(true);
  }

  function openEditContact(contact: any) {
    setEditingContactId(contact._id);
    setContactForm({
      name: contact.name || "",
      category: contact.category || "",
      organization: contact.organization || "",
      phone: contact.phone || "",
      email: contact.email || "",
      socialLink: contact.socialLink || "",
      description: contact.description || "",
      status: contact.status || "nuevo",
      birthDate: contact.birthDate || "",
      photoUrl: contact.photoUrl || "",
    });
    setContactModalOpen(true);
  }

  async function handleSaveContact() {
    if (isSubmittingContact) return;
    const name = contactForm.name.trim();
    if (!name) return;
    setIsSubmittingContact(true);

    try {
      const payload = {
        name,
        category: contactForm.category.trim() || undefined,
        organization: contactForm.organization.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        email: contactForm.email.trim() || undefined,
        socialLink: contactForm.socialLink.trim() || undefined,
        description: contactForm.description.trim() || undefined,
        status: contactForm.status,
        birthDate: contactForm.birthDate.trim() || undefined,
        photoUrl: contactForm.photoUrl.trim() || undefined,
      };

      if (editingContactId) {
        await updatePotentialContact({
          id: editingContactId as any,
          ...payload,
        });
      } else {
        await createPotentialContact(payload);
      }
      setContactModalOpen(false);
    } catch (err) {
      console.error("Error al guardar contacto potencial:", err);
    } finally {
      setIsSubmittingContact(false);
    }
  }

  function handleDeleteContact(id: string) {
    setContactToDeleteId(id);
  }

  const empColumns: Column<any>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (e) => (
        <div className="flex flex-col">
          <span className="font-bold text-sm text-grayscale-12">{e.name}</span>
          <span className="text-xs text-grayscale-9">{e.role}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto",
      className: "hidden sm:table-cell",
      render: (e) => (
        <div className="flex flex-col text-xs">
          <span className="text-grayscale-11 font-mono">{e.email}</span>
          {e.phone ? (
            <a
              href={getWhatsAppLink(e.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-grayscale-9 hover:text-green-11 hover:underline transition-colors font-mono"
              title="Abrir chat de WhatsApp"
            >
              {e.phone}
            </a>
          ) : (
            <span className="text-grayscale-8">Sin teléfono</span>
          )}
        </div>
      ),
    },
    {
      key: "birthDate",
      header: "Cumpleaños",
      render: (e) => {
        const bday = getBirthdayInfo(e.birthDate);
        if (!bday) {
          return (
            <span className="text-xs text-grayscale-8 italic">
              No registrado
            </span>
          );
        }
        return (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-grayscale-12 flex items-center gap-1">
              <CakeIcon size={14} className="text-amber-500 shrink-0" />
              {bday.dayMonthFormatted}{" "}
              <span className="text-grayscale-9 text-[11px] font-normal">
                ({bday.currentAge}a)
              </span>
            </span>
            <span
              className={cn(
                "font-mono text-[10px] font-bold mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded w-fit border",
                bday.isToday &&
                  "bg-amber-400/20 text-amber-11 border-amber-500/40 animate-pulse",
                bday.daysRemaining > 0 &&
                  bday.daysRemaining <= 7 &&
                  "bg-orange-3 text-orange-11 border-orange-5 dark:bg-orange-4/30",
                bday.daysRemaining > 7 &&
                  bday.daysRemaining <= 30 &&
                  "bg-sky-3 text-sky-11 border-sky-5 dark:bg-sky-4/30",
                bday.daysRemaining > 30 &&
                  "bg-grayscale-3 text-grayscale-10 border-grayscale-4 dark:bg-grayscale-4 dark:text-grayscale-11",
              )}
            >
              {bday.badgeText}
            </span>
          </div>
        );
      },
    },
    {
      key: "salary",
      header: "Salario",
      className: "hidden md:table-cell",
      render: (e) => (
        <span className="font-mono text-xs font-bold text-grayscale-12">
          {e.salary ? formatCurrency(e.salary) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (e) => (
        <Badge
          variant={
            e.status === "activo"
              ? "green"
              : e.status === "vacaciones"
                ? "orange"
                : "gray"
          }
        >
          {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="Editar empleado"
            onClick={() => openEditEmp(e)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-11 transition-colors"
          >
            <PencilSimpleIcon size={14} />
          </button>
          <button
            type="button"
            title="Eliminar empleado"
            onClick={() => removeEmployee({ id: e._id })}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 transition-colors"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Birthdays aggregation across all groups
  const allPeopleBirthdays = [
    ...(canViewStaff
      ? employees.map((e) => ({
          id: e._id,
          name: e.name,
          role: e.role || "Equipo de producción",
          category: "Producción",
          phone: e.phone,
          birthDate: e.birthDate,
          info: getBirthdayInfo(e.birthDate),
        }))
      : []),
    ...actors.map((a) => ({
      id: a._id,
      name: a.name,
      role: `Actor (${a.characterName})`,
      category: "Elenco",
      phone: a.phone,
      birthDate: a.birthDate,
      info: getBirthdayInfo(a.birthDate),
    })),
    ...castingLeads.map((l: any) => ({
      id: l._id,
      name: l.name,
      role: "Persona interesada",
      category: "Candidato",
      phone: l.phone || "",
      birthDate: l.birthDate,
      info: getBirthdayInfo(l.birthDate),
    })),
    ...potentialCollaborators.map((c: any) => ({
      id: c._id,
      name: c.name,
      role: c.area || "Colaborador potencial",
      category: "Colaborador",
      phone: c.phone || "",
      birthDate: c.birthDate,
      info: getBirthdayInfo(c.birthDate),
    })),
    ...potentialContacts.map((c: any) => ({
      id: c._id,
      name: c.name,
      role: c.category || c.organization || "Contacto potencial",
      category: "Contacto",
      phone: c.phone || "",
      birthDate: c.birthDate,
      info: getBirthdayInfo(c.birthDate),
    })),
  ]
    .filter((p) => p.info !== null)
    .sort((a, b) => a.info!.daysRemaining - b.info!.daysRemaining);

  const todaysBirthdays = allPeopleBirthdays.filter((p) => p.info?.isToday);
  const upcomingBirthdays = allPeopleBirthdays.filter(
    (p) => !p.info?.isToday && p.info!.daysRemaining <= 30,
  );

  return (
    <PageContainer size="wide">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-xl font-bold uppercase text-grayscale-12">
            {!canViewStaff
              ? "Gestión de elenco, casting y contactos"
              : "Gestión de personal y contactos"}
          </h1>
          <p className="text-sm text-grayscale-10">
            {!canViewStaff
              ? "Administra el elenco de actores, personajes, interesados en grabar, colaboradores y contactos potenciales."
              : "Administra el equipo técnico de producción, actores del elenco, interesados en grabar, colaboradores y contactos potenciales."}
          </p>
        </div>

        {/* Stat Cards */}
        <div
          className={`grid grid-cols-1 gap-3 ${
            !canViewStaff
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          }`}
        >
          {canViewStaff && (
            <StatCard
              label="Equipo de producción"
              value={activeEmpCount}
              detail={`${employees.length} miembros registrados`}
              icon={<UsersIcon size={18} weight="fill" />}
              index={0}
            />
          )}
          <StatCard
            label="Elenco y personajes"
            value={activeActorCount}
            detail={`${actors.length} actores registrados`}
            icon={<UserCheckIcon size={18} weight="fill" />}
            index={!canViewStaff ? 0 : 1}
          />
          <StatCard
            label="Interesados en grabar"
            value={castingLeads.length}
            detail="Candidatos en prospección"
            icon={<UserPlusIcon size={18} weight="fill" />}
            index={!canViewStaff ? 1 : 2}
          />
          <StatCard
            label="Colaboradores potenciales"
            value={potentialCollaborators.length}
            detail={`${activeCollabCount} confirmados`}
            icon={<HandshakeIcon size={18} weight="fill" />}
            index={!canViewStaff ? 2 : 3}
          />
          <StatCard
            label="Contactos potenciales"
            value={potentialContacts.length}
            detail={`${activeContactCount} en seguimiento`}
            icon={<AddressBookIcon size={18} weight="fill" />}
            index={!canViewStaff ? 3 : 4}
          />
        </div>

        {/* Banner de Cumpleaños del Día */}
        {todaysBirthdays.map((person) => (
          <div
            key={person.id}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-yellow-500/20 p-4 border border-amber-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-amber-500 text-white shrink-0 shadow-md">
                <CakeIcon size={24} weight="fill" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                    Cumpleaños hoy
                  </span>
                  <span className="text-xs text-amber-11 dark:text-amber-9 font-mono font-bold">
                    {person.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-grayscale-12 mt-0.5">
                  {person.name} —{" "}
                  <span className="font-normal text-grayscale-11 text-sm">
                    {person.role}
                  </span>
                </h3>
                <p className="text-xs text-grayscale-10">
                  Cumple{" "}
                  <strong className="text-amber-11 dark:text-amber-9 font-bold">
                    {person.info?.currentAge} años
                  </strong>{" "}
                  el día de hoy ({person.info?.dayMonthFormatted})
                </p>
              </div>
            </div>

            {person.phone && (
              <a
                href={getWhatsAppLink(person.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-green-700 transition-colors shadow-sm shrink-0"
              >
                <PhoneIcon size={15} weight="bold" />
                <span>Felicitar por WhatsApp</span>
              </a>
            )}
          </div>
        ))}

        {/* Tabs System */}
        <Tabs.Root
          defaultValue={canViewStaff ? "staff" : "actors"}
          className="w-full flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-grayscale-3 dark:border-grayscale-4 pb-2">
            <Tabs.List className="border-0 pb-0 gap-1.5">
              {canViewStaff && (
                <Tabs.Tab
                  value="staff"
                  className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
                >
                  Equipo de producción ({employees.length})
                </Tabs.Tab>
              )}
              <Tabs.Tab
                value="actors"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Elenco y personajes ({actors.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="leads"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Interesados en grabar ({castingLeads.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="collaborators"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Colaboradores potenciales ({potentialCollaborators.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="contacts"
                className="font-mono text-[10px] font-bold uppercase py-1.5 px-3"
              >
                Contactos potenciales ({potentialContacts.length})
              </Tabs.Tab>
              <Tabs.Indicator />
            </Tabs.List>
          </div>

          {/* Tab Panel 1: Equipo de producción */}
          {canViewStaff && (
            <Tabs.Panel value="staff">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative">
                    <MagnifyingGlassIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                    />
                    <input
                      type="text"
                      placeholder="Buscar personal o puesto..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={openCreateEmp}
                  >
                    <PlusIcon size={16} weight="bold" />
                    Agregar empleado de producción
                  </Button>
                </div>

                <DataTable
                  columns={empColumns}
                  data={filteredEmployees}
                  keyExtractor={(e) => e._id}
                  emptyState={
                    <EmptyState
                      icon={<UsersIcon size={36} />}
                      title={
                        search
                          ? "No se encontraron empleados"
                          : "No hay empleados registrados"
                      }
                      description={
                        search
                          ? "Intenta con otro término de búsqueda."
                          : "Comienza agregando miembros al equipo técnico y de producción."
                      }
                      action={
                        !search && (
                          <Button
                            variant="primary"
                            className="text-xs"
                            onClick={openCreateEmp}
                          >
                            <PlusIcon size={16} weight="bold" />
                            Agregar primer empleado
                          </Button>
                        )
                      }
                    />
                  }
                />
              </div>
            </Tabs.Panel>
          )}

          {/* Tab Panel 2: Elenco y personajes */}
          <Tabs.Panel value="actors">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar actor, personaje o biografía..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                  />
                </div>
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={openCreateActor}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar actor / personaje
                </Button>
              </div>

              {/* Grid de Tarjetas de Elenco a 2 Columnas en Móviles */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredActors.map((actor) => (
                  <div
                    key={actor._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-1 p-2.5 sm:p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-lg dark:border-grayscale-4/80 dark:bg-grayscale-2"
                  >
                    <div className="flex flex-col gap-2.5 sm:gap-3">
                      {/* Vertical Portrait Photo Frame */}
                      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner">
                        {actor.photoUrl ? (
                          <img
                            src={actor.photoUrl}
                            alt={actor.characterName}
                            className="size-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center font-mono text-xl sm:text-2xl font-bold text-accent-11 bg-accent-3">
                            {actor.characterName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Character & Actor Name Block */}
                      <div className="flex flex-col gap-0.5 px-0.5">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent-10 dark:text-accent-9 truncate">
                            {actor.characterName}
                          </span>
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 font-mono text-[9px] sm:text-[10px] font-bold text-grayscale-11 bg-grayscale-2 dark:bg-grayscale-3/80 px-1 sm:px-1.5 py-0.5 rounded border border-grayscale-3 dark:border-grayscale-4/80 shrink-0">
                            <FilmStripIcon
                              size={11}
                              className="text-sky-500 shrink-0"
                            />
                            <span>
                              {actor.episodeCount}{" "}
                              <span className="hidden xs:inline">cap.</span>
                            </span>
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-extrabold tracking-tight text-grayscale-12 truncate">
                          {actor.name}
                        </h3>
                        {actor.characterBio ? (
                          <p className="text-[11px] sm:text-xs text-grayscale-10 dark:text-grayscale-11 leading-snug line-clamp-2 mt-0.5">
                            {actor.characterBio}
                          </p>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-grayscale-8 italic mt-0.5">
                            Sin descripción.
                          </p>
                        )}

                        {(() => {
                          const bday = getBirthdayInfo(actor.birthDate);
                          if (!bday) return null;
                          return (
                            <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] bg-grayscale-2/80 dark:bg-grayscale-3/60 px-2 py-1 rounded-lg border border-grayscale-3/60 dark:border-grayscale-4/60">
                              <div className="flex items-center gap-1 text-grayscale-11 font-mono text-[10px] truncate">
                                <CakeIcon
                                  size={12}
                                  className="text-amber-500 shrink-0"
                                />
                                <span className="truncate">
                                  {bday.dayMonthFormatted} ({bday.currentAge}a)
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border",
                                  bday.isToday &&
                                    "bg-amber-400/20 text-amber-11 border-amber-500/40 animate-pulse",
                                  bday.daysRemaining > 0 &&
                                    bday.daysRemaining <= 7 &&
                                    "bg-orange-3 text-orange-11 border-orange-5 dark:bg-orange-4/30",
                                  bday.daysRemaining > 7 &&
                                    bday.daysRemaining <= 30 &&
                                    "bg-sky-3 text-sky-11 border-sky-5 dark:bg-sky-4/30",
                                  bday.daysRemaining > 30 &&
                                    "bg-grayscale-3 text-grayscale-10 border-grayscale-4 dark:bg-grayscale-4 dark:text-grayscale-11",
                                )}
                              >
                                {bday.badgeText}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-2.5 sm:mt-3 flex items-center justify-between border-t border-grayscale-3 pt-2 sm:pt-2.5 gap-1 dark:border-grayscale-4/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            copyActorPublicLink(actor.name, actor._id)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-accent-6/40 bg-accent-2/10 px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-accent-11 hover:bg-accent-2/30 transition-all cursor-pointer"
                          title="Copiar enlace público de agenda"
                        >
                          {copiedLinkActorId === actor._id ? (
                            <>
                              <CheckCircleIcon
                                size={12}
                                className="text-green-9 shrink-0"
                              />
                              <span className="hidden sm:inline">Copiado</span>
                            </>
                          ) : (
                            <>
                              <ShareNetworkIcon
                                size={12}
                                className="text-accent-9 shrink-0"
                              />
                              <span className="hidden sm:inline">Enlace</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFichaActor(actor);
                            setFichaModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-grayscale-3 bg-grayscale-2 px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-grayscale-12 hover:border-accent-6 hover:text-accent-11 transition-all cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
                          title="Ver ficha completa del personaje"
                        >
                          <IdentificationCardIcon
                            size={12}
                            className="text-sky-500 shrink-0"
                          />
                          <span className="hidden sm:inline">Ficha</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditActor(actor)}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:text-grayscale-8 dark:hover:bg-grayscale-4 transition-colors"
                          title="Editar actor"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeActor({ id: actor._id })}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 dark:text-grayscale-8 dark:hover:bg-red-4/30 transition-colors"
                          title="Eliminar actor"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredActors.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<UserCheckIcon size={40} weight="duotone" />}
                      title="Sin actores en el elenco"
                      description={
                        search
                          ? "Sin resultados para la búsqueda."
                          : "Aún no has registrado actores ni personajes."
                      }
                      action={
                        !search && (
                          <Button
                            variant="primary"
                            className="text-xs"
                            onClick={openCreateActor}
                          >
                            <PlusIcon size={16} weight="bold" />
                            Agregar primer actor
                          </Button>
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* Tab Panel 3: Interesados en grabar */}
          <Tabs.Panel value="leads">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                  />
                  <input
                    type="text"
                    placeholder="Buscar interesado por nombre, número o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 sm:w-80"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {duplicateLeadsCount > 0 && (
                    <Button
                      variant="secondary"
                      className="text-xs text-amber-11 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 dark:text-amber-9 font-medium"
                      onClick={handleCleanDuplicates}
                      disabled={isCleaningDuplicates}
                    >
                      <BroomIcon size={16} />
                      {isCleaningDuplicates
                        ? "Limpiando duplicados..."
                        : `Limpiar ${duplicateLeadsCount} duplicados`}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={openCreateLead}
                  >
                    <PlusIcon size={16} weight="bold" />
                    Agregar persona interesada
                  </Button>
                </div>
              </div>

              {/* Grid de Tarjetas de Interesados a 2 Columnas en Móviles */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredLeads.map((lead: any) => (
                  <div
                    key={lead._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-1 p-3 sm:p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-lg dark:border-grayscale-4/80 dark:bg-grayscale-2"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {lead.photoUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewLeadPhoto({
                                url: lead.photoUrl,
                                name: lead.name || "Persona interesada",
                                phone: lead.phone,
                                description: lead.description,
                              })
                            }
                            className="group/photo relative size-9 sm:size-10 overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-8"
                            title="Ver foto en grande"
                            aria-label={`Ver foto en grande de ${lead.name || "persona interesada"}`}
                          >
                            <img
                              src={lead.photoUrl}
                              alt={lead.name || "Persona interesada"}
                              className="size-full object-cover object-center transition-opacity duration-200 group-hover/photo:opacity-90"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200">
                              <MagnifyingGlassIcon
                                size={14}
                                weight="bold"
                                className="text-white drop-shadow"
                              />
                            </div>
                          </button>
                        ) : (
                          <div className="relative size-9 sm:size-10 overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner shrink-0">
                            <div className="flex size-full items-center justify-center font-mono text-xs sm:text-sm font-bold text-accent-11 bg-accent-3">
                              {(lead.name || "Persona")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-xs sm:text-sm text-grayscale-12 truncate">
                            {lead.name || "Persona interesada"}
                          </span>
                          <a
                            href={
                              lead.phone ? getWhatsAppLink(lead.phone) : "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] sm:text-xs text-grayscale-10 font-mono hover:text-green-11 hover:underline transition-colors group/wa"
                            title={
                              lead.phone
                                ? "Abrir chat de WhatsApp"
                                : "Sin teléfono registrado"
                            }
                          >
                            <PhoneIcon
                              size={11}
                              className="text-accent-9 group-hover/wa:text-green-11 shrink-0 transition-colors"
                            />
                            <span className="truncate">
                              {lead.phone || "Sin teléfono"}
                            </span>
                          </a>
                        </div>
                      </div>

                      {lead.description ? (
                        <p className="text-[11px] sm:text-xs text-grayscale-10 dark:text-grayscale-11 leading-snug line-clamp-3 mt-1 bg-grayscale-2/50 dark:bg-grayscale-3/40 p-2 rounded-xl border border-grayscale-3/40 dark:border-grayscale-4/40">
                          {lead.description}
                        </p>
                      ) : (
                        <p className="text-[11px] sm:text-xs text-grayscale-8 italic mt-1">
                          Sin descripción registrada.
                        </p>
                      )}

                      {(() => {
                        const bday = getBirthdayInfo(lead.birthDate);
                        if (!bday) return null;
                        return (
                          <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] bg-grayscale-2/80 dark:bg-grayscale-3/60 px-2 py-1 rounded-lg border border-grayscale-3/60 dark:border-grayscale-4/60">
                            <div className="flex items-center gap-1 text-grayscale-11 font-mono text-[10px] truncate">
                              <CakeIcon
                                size={12}
                                className="text-amber-500 shrink-0"
                              />
                              <span className="truncate">
                                {bday.dayMonthFormatted} ({bday.currentAge}a)
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border",
                                bday.isToday &&
                                  "bg-amber-400/20 text-amber-11 border-amber-500/40 animate-pulse",
                                bday.daysRemaining > 0 &&
                                  bday.daysRemaining <= 7 &&
                                  "bg-orange-3 text-orange-11 border-orange-5 dark:bg-orange-4/30",
                                bday.daysRemaining > 7 &&
                                  bday.daysRemaining <= 30 &&
                                  "bg-sky-3 text-sky-11 border-sky-5 dark:bg-sky-4/30",
                                bday.daysRemaining > 30 &&
                                  "bg-grayscale-3 text-grayscale-10 border-grayscale-4 dark:bg-grayscale-4 dark:text-grayscale-11",
                              )}
                            >
                              {bday.badgeText}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-2.5 sm:mt-3 flex items-center justify-between border-t border-grayscale-3 pt-2 sm:pt-2.5 dark:border-grayscale-4/60">
                      <span className="text-[10px] text-grayscale-9 font-mono">
                        {formatDate(lead.createdAt)}
                      </span>
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditLead(lead)}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:text-grayscale-8 dark:hover:bg-grayscale-4 transition-colors"
                          title="Editar interesado"
                        >
                          <PencilSimpleIcon size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead._id)}
                          className="flex size-6 sm:size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 dark:text-grayscale-8 dark:hover:bg-red-4/30 transition-colors"
                          title="Eliminar interesado"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLeads.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<UserPlusIcon size={40} weight="duotone" />}
                      title="Sin interesados en grabar"
                      description={
                        search
                          ? "Sin resultados para la búsqueda."
                          : "Aún no has registrado personas interesadas en participar o grabar."
                      }
                      action={
                        !search && (
                          <Button
                            variant="primary"
                            className="text-xs"
                            onClick={openCreateLead}
                          >
                            <PlusIcon size={16} weight="bold" />
                            Agregar primera persona interesada
                          </Button>
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* Tab Panel 4: Colaboradores potenciales */}
          <Tabs.Panel value="collaborators">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                  <div className="relative flex-1 sm:max-w-xs">
                    <MagnifyingGlassIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, área o contacto..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { value: "all", label: "Todos" },
                      { value: "por_contactar", label: "Por contactar" },
                      { value: "en_conversacion", label: "En conversación" },
                      { value: "confirmado", label: "Confirmados" },
                      { value: "descartado", label: "Descartados" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCollabStatusFilter(opt.value)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border",
                          collabStatusFilter === opt.value
                            ? "bg-accent-9 text-white border-accent-9 dark:bg-accent-9 dark:text-grayscale-1"
                            : "bg-grayscale-2 text-grayscale-10 border-grayscale-3 hover:bg-grayscale-3 dark:bg-grayscale-3 dark:text-grayscale-11 dark:border-grayscale-4",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="text-xs shrink-0"
                  onClick={openCreateCollab}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar colaborador potencial
                </Button>
              </div>

              {/* Grid de Tarjetas de Colaboradores */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCollaborators.map((collab: any) => (
                  <div
                    key={collab._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-1 p-3.5 sm:p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-lg dark:border-grayscale-4/80 dark:bg-grayscale-2"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {collab.photoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewLeadPhoto({
                                  url: collab.photoUrl,
                                  name: collab.name || "Colaborador potencial",
                                  phone: collab.phone,
                                  description: collab.description,
                                })
                              }
                              className="group/collabthumb relative size-11 overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-8"
                              title="Ver foto en grande"
                              aria-label={`Ver foto en grande de ${collab.name || "colaborador"}`}
                            >
                              <img
                                src={collab.photoUrl}
                                alt={collab.name || "Colaborador potencial"}
                                className="size-full object-cover object-center transition-opacity duration-200 group-hover/collabthumb:opacity-90"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/collabthumb:opacity-100 transition-opacity duration-200">
                                <MagnifyingGlassIcon
                                  size={14}
                                  weight="bold"
                                  className="text-white drop-shadow"
                                />
                              </div>
                            </button>
                          ) : (
                            <div className="relative size-11 overflow-hidden rounded-xl bg-accent-3/70 dark:bg-accent-4/30 border border-accent-5/40 shadow-inner shrink-0 flex items-center justify-center">
                              <span className="font-mono text-sm font-extrabold text-accent-11">
                                {(collab.name || "Colaborador")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <h3 className="font-extrabold text-sm text-grayscale-12 truncate leading-tight">
                              {collab.name}
                            </h3>
                            {collab.area ? (
                              <span className="font-mono text-[10px] font-bold text-accent-10 dark:text-accent-9 truncate mt-0.5">
                                {collab.area}
                              </span>
                            ) : (
                              <span className="text-[10px] text-grayscale-8 italic mt-0.5">
                                Sin área especificada
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant={
                              collab.status === "confirmado"
                                ? "green"
                                : collab.status === "en_conversacion"
                                  ? "orange"
                                  : collab.status === "descartado"
                                    ? "gray"
                                    : "accent"
                            }
                          >
                            {collab.status === "confirmado"
                              ? "Confirmado"
                              : collab.status === "en_conversacion"
                                ? "En conversación"
                                : collab.status === "descartado"
                                  ? "Descartado"
                                  : "Por contactar"}
                          </Badge>
                        </div>
                      </div>

                      {/* Info & Social Links */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        {collab.phone && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              WhatsApp:
                            </span>
                            <a
                              href={getWhatsAppLink(collab.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-grayscale-12 hover:text-green-11 hover:underline transition-colors"
                              title="Abrir chat de WhatsApp"
                            >
                              <PhoneIcon
                                size={12}
                                className="text-green-9 shrink-0"
                              />
                              <span>{collab.phone}</span>
                            </a>
                          </div>
                        )}

                        {collab.email && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              Correo:
                            </span>
                            <a
                              href={`mailto:${collab.email}`}
                              className="font-bold text-grayscale-12 hover:text-accent-11 hover:underline transition-colors truncate max-w-[170px]"
                              title={collab.email}
                            >
                              {collab.email}
                            </a>
                          </div>
                        )}

                        {collab.socialLink && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              Red / Enlace:
                            </span>
                            <a
                              href={getSocialUrl(collab.socialLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-accent-11 hover:underline transition-colors truncate max-w-[170px]"
                              title={collab.socialLink}
                            >
                              <ArrowSquareOutIcon
                                size={12}
                                className="shrink-0"
                              />
                              <span className="truncate">
                                {collab.socialLink}
                              </span>
                            </a>
                          </div>
                        )}
                      </div>

                      {collab.description ? (
                        <p className="text-[11px] sm:text-xs text-grayscale-10 dark:text-grayscale-11 leading-snug line-clamp-3 bg-grayscale-2/60 dark:bg-grayscale-3/40 p-2.5 rounded-xl border border-grayscale-3/40 dark:border-grayscale-4/40 mt-0.5">
                          {collab.description}
                        </p>
                      ) : (
                        <p className="text-[11px] sm:text-xs text-grayscale-8 italic mt-0.5">
                          Sin notas o propuesta registrada.
                        </p>
                      )}

                      {(() => {
                        const bday = getBirthdayInfo(collab.birthDate);
                        if (!bday) return null;
                        return (
                          <div className="mt-1 flex items-center justify-between gap-1 text-[10px] bg-grayscale-2/80 dark:bg-grayscale-3/60 px-2 py-1 rounded-lg border border-grayscale-3/60 dark:border-grayscale-4/60">
                            <div className="flex items-center gap-1 text-grayscale-11 font-mono text-[10px] truncate">
                              <CakeIcon
                                size={12}
                                className="text-amber-500 shrink-0"
                              />
                              <span className="truncate">
                                {bday.dayMonthFormatted} ({bday.currentAge}a)
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border",
                                bday.isToday &&
                                  "bg-amber-400/20 text-amber-11 border-amber-500/40 animate-pulse",
                                bday.daysRemaining > 0 &&
                                  bday.daysRemaining <= 7 &&
                                  "bg-orange-3 text-orange-11 border-orange-5 dark:bg-orange-4/30",
                                bday.daysRemaining > 7 &&
                                  bday.daysRemaining <= 30 &&
                                  "bg-sky-3 text-sky-11 border-sky-5 dark:bg-sky-4/30",
                                bday.daysRemaining > 30 &&
                                  "bg-grayscale-3 text-grayscale-10 border-grayscale-4 dark:bg-grayscale-4 dark:text-grayscale-11",
                              )}
                            >
                              {bday.badgeText}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-grayscale-3 pt-2.5 dark:border-grayscale-4/60">
                      <span className="text-[10px] text-grayscale-9 font-mono">
                        {formatDate(collab.createdAt)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditCollab(collab)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:text-grayscale-8 dark:hover:bg-grayscale-4 transition-colors"
                          title="Editar colaborador"
                        >
                          <PencilSimpleIcon size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollab(collab._id)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 dark:text-grayscale-8 dark:hover:bg-red-4/30 transition-colors"
                          title="Eliminar colaborador"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCollaborators.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<HandshakeIcon size={40} weight="duotone" />}
                      title="Sin colaboradores potenciales"
                      description={
                        search || collabStatusFilter !== "all"
                          ? "Sin resultados para los filtros seleccionados."
                          : "Aún no has registrado colaboradores potenciales o alianzas estratégicas."
                      }
                      action={
                        !search &&
                        collabStatusFilter === "all" && (
                          <Button
                            variant="primary"
                            className="text-xs"
                            onClick={openCreateCollab}
                          >
                            <PlusIcon size={16} weight="bold" />
                            Agregar primer colaborador potencial
                          </Button>
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>

          {/* Tab Panel 5: Contactos potenciales */}
          <Tabs.Panel value="contacts">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                  <div className="relative flex-1 sm:max-w-xs">
                    <MagnifyingGlassIcon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-grayscale-8"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, organización, categoría o notas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 py-2 pl-9 pr-3 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { value: "all", label: "Todos los estados" },
                      { value: "nuevo", label: "Nuevo" },
                      { value: "en_seguimiento", label: "En seguimiento" },
                      { value: "contactado", label: "Contactado" },
                      { value: "convertido", label: "Convertido" },
                      { value: "descartado", label: "Descartado" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setContactStatusFilter(opt.value)}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer border",
                          contactStatusFilter === opt.value
                            ? "bg-accent-9 text-white border-accent-9 dark:bg-accent-9 dark:text-grayscale-1"
                            : "bg-grayscale-2 text-grayscale-10 border-grayscale-3 hover:bg-grayscale-3 dark:bg-grayscale-3 dark:text-grayscale-11 dark:border-grayscale-4",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="text-xs shrink-0"
                  onClick={openCreateContact}
                >
                  <PlusIcon size={16} weight="bold" />
                  Agregar contacto potencial
                </Button>
              </div>

              {/* Grid de Tarjetas de Contactos Potenciales */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredContacts.map((contact: any) => (
                  <div
                    key={contact._id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-1 p-3.5 sm:p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-6 hover:shadow-lg dark:border-grayscale-4/80 dark:bg-grayscale-2"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {contact.photoUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewLeadPhoto({
                                  url: contact.photoUrl,
                                  name: contact.name || "Contacto potencial",
                                  phone: contact.phone,
                                  description: contact.description,
                                })
                              }
                              className="group/contactthumb relative size-11 overflow-hidden rounded-xl bg-grayscale-2 dark:bg-grayscale-3/40 border border-grayscale-3/60 dark:border-grayscale-4/60 shadow-inner shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-8"
                              title="Ver foto en grande"
                              aria-label={`Ver foto en grande de ${contact.name || "contacto"}`}
                            >
                              <img
                                src={contact.photoUrl}
                                alt={contact.name || "Contacto potencial"}
                                className="size-full object-cover object-center transition-opacity duration-200 group-hover/contactthumb:opacity-90"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/contactthumb:opacity-100 transition-opacity duration-200">
                                <MagnifyingGlassIcon
                                  size={14}
                                  weight="bold"
                                  className="text-white drop-shadow"
                                />
                              </div>
                            </button>
                          ) : (
                            <div className="relative size-11 overflow-hidden rounded-xl bg-accent-3/70 dark:bg-accent-4/30 border border-accent-5/40 shadow-inner shrink-0 flex items-center justify-center">
                              <span className="font-mono text-sm font-extrabold text-accent-11">
                                {(contact.name || "Contacto")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <h3 className="font-extrabold text-sm text-grayscale-12 truncate leading-tight">
                              {contact.name}
                            </h3>
                            {contact.organization ? (
                              <span className="font-mono text-[10px] text-grayscale-10 dark:text-grayscale-9 truncate flex items-center gap-1 mt-0.5">
                                <BuildingsIcon
                                  size={12}
                                  className="shrink-0 text-grayscale-8"
                                />
                                {contact.organization}
                              </span>
                            ) : null}
                            {contact.category ? (
                              <span className="font-mono text-[9px] font-bold text-accent-10 dark:text-accent-9 truncate mt-0.5">
                                {contact.category}
                              </span>
                            ) : (
                              <span className="text-[10px] text-grayscale-8 italic mt-0.5">
                                Sin categoría
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant={
                              contact.status === "convertido"
                                ? "green"
                                : contact.status === "en_seguimiento"
                                  ? "orange"
                                  : contact.status === "contactado"
                                    ? "accent"
                                    : contact.status === "descartado"
                                      ? "gray"
                                      : "accent"
                            }
                          >
                            {contact.status === "convertido"
                              ? "Convertido"
                              : contact.status === "en_seguimiento"
                                ? "En seguimiento"
                                : contact.status === "contactado"
                                  ? "Contactado"
                                  : contact.status === "descartado"
                                    ? "Descartado"
                                    : "Nuevo"}
                          </Badge>
                        </div>
                      </div>

                      {/* Info & Social Links */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        {contact.phone && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              WhatsApp:
                            </span>
                            <a
                              href={getWhatsAppLink(contact.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-grayscale-12 hover:text-green-11 hover:underline transition-colors"
                              title="Abrir chat de WhatsApp"
                            >
                              <PhoneIcon
                                size={12}
                                className="text-green-9 shrink-0"
                              />
                              <span>{contact.phone}</span>
                            </a>
                          </div>
                        )}

                        {contact.email && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              Correo:
                            </span>
                            <a
                              href={`mailto:${contact.email}`}
                              className="font-bold text-grayscale-12 hover:text-accent-11 hover:underline transition-colors truncate max-w-[170px]"
                              title={contact.email}
                            >
                              {contact.email}
                            </a>
                          </div>
                        )}

                        {contact.socialLink && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-grayscale-9 text-[11px]">
                              Red / Web:
                            </span>
                            <a
                              href={getSocialUrl(contact.socialLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-accent-11 hover:underline transition-colors truncate max-w-[170px]"
                              title={contact.socialLink}
                            >
                              <ArrowSquareOutIcon
                                size={12}
                                className="shrink-0"
                              />
                              <span className="truncate">
                                {contact.socialLink}
                              </span>
                            </a>
                          </div>
                        )}
                      </div>

                      {contact.description ? (
                        <p className="text-[11px] sm:text-xs text-grayscale-10 dark:text-grayscale-11 leading-snug line-clamp-3 bg-grayscale-2/60 dark:bg-grayscale-3/40 p-2.5 rounded-xl border border-grayscale-3/40 dark:border-grayscale-4/40 mt-0.5">
                          {contact.description}
                        </p>
                      ) : (
                        <p className="text-[11px] sm:text-xs text-grayscale-8 italic mt-0.5">
                          Sin notas registradas.
                        </p>
                      )}

                      {(() => {
                        const bday = getBirthdayInfo(contact.birthDate);
                        if (!bday) return null;
                        return (
                          <div className="mt-1 flex items-center justify-between gap-1 text-[10px] bg-grayscale-2/80 dark:bg-grayscale-3/60 px-2 py-1 rounded-lg border border-grayscale-3/60 dark:border-grayscale-4/60">
                            <div className="flex items-center gap-1 text-grayscale-11 font-mono text-[10px] truncate">
                              <CakeIcon
                                size={12}
                                className="text-amber-500 shrink-0"
                              />
                              <span className="truncate">
                                {bday.dayMonthFormatted} ({bday.currentAge}a)
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border",
                                bday.isToday &&
                                  "bg-amber-400/20 text-amber-11 border-amber-500/40 animate-pulse",
                                bday.daysRemaining > 0 &&
                                  bday.daysRemaining <= 7 &&
                                  "bg-orange-3 text-orange-11 border-orange-5 dark:bg-orange-4/30",
                                bday.daysRemaining > 7 &&
                                  bday.daysRemaining <= 30 &&
                                  "bg-sky-3 text-sky-11 border-sky-5 dark:bg-sky-4/30",
                                bday.daysRemaining > 30 &&
                                  "bg-grayscale-3 text-grayscale-10 border-grayscale-4 dark:bg-grayscale-4 dark:text-grayscale-11",
                              )}
                            >
                              {bday.badgeText}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-grayscale-3 pt-2.5 dark:border-grayscale-4/60">
                      <span className="text-[10px] text-grayscale-9 font-mono">
                        {formatDate(contact.createdAt)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditContact(contact)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-grayscale-3 hover:text-grayscale-12 dark:text-grayscale-8 dark:hover:bg-grayscale-4 transition-colors"
                          title="Editar contacto"
                        >
                          <PencilSimpleIcon size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact._id)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-grayscale-9 hover:bg-red-3 hover:text-red-11 dark:text-grayscale-8 dark:hover:bg-red-4/30 transition-colors"
                          title="Eliminar contacto"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredContacts.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<AddressBookIcon size={40} weight="duotone" />}
                      title="Sin contactos potenciales"
                      description={
                        search ||
                        contactStatusFilter !== "all" ||
                        contactCategoryFilter !== "all"
                          ? "Sin resultados para los filtros seleccionados."
                          : "Aún no has registrado contactos potenciales de interés comercial, artístico o colaborativo."
                      }
                      action={
                        !search &&
                        contactStatusFilter === "all" &&
                        contactCategoryFilter === "all" && (
                          <Button
                            variant="primary"
                            className="text-xs"
                            onClick={openCreateContact}
                          >
                            <PlusIcon size={16} weight="bold" />
                            Agregar primer contacto potencial
                          </Button>
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </Tabs.Panel>
        </Tabs.Root>

        {/* Modal Crear / Editar Empleado */}
        <Modal
          open={empModalOpen}
          onOpenChange={setEmpModalOpen}
          title={
            editingEmpId ? "Editar empleado" : "Agregar empleado de producción"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEmp();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Nombre completo"
              id="emp-name"
              value={empForm.name}
              onChange={(e) =>
                setEmpForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Valeria Quirós"
            />

            <Input
              label="Puesto / rol"
              id="emp-role"
              value={empForm.role}
              onChange={(e) =>
                setEmpForm((f) => ({ ...f, role: e.target.value }))
              }
              placeholder="Ej: Directora de fotografía"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Teléfono"
                id="emp-phone"
                value={empForm.phone}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+506 8888-0000"
              />
              <Input
                label="Correo electrónico"
                id="emp-email"
                type="email"
                value={empForm.email}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha de nacimiento"
                id="emp-birthdate"
                type="date"
                value={empForm.birthDate}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
              <Input
                label="Salario (CRC ₡)"
                id="emp-salary"
                type="number"
                value={empForm.salary}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, salary: Number(e.target.value) }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Capítulos de participación"
                id="emp-episodes"
                type="number"
                value={empForm.episodeCount}
                onChange={(e) =>
                  setEmpForm((f) => ({
                    ...f,
                    episodeCount: Number(e.target.value),
                  }))
                }
              />
              <Select
                label="Estado"
                id="emp-status"
                value={empForm.status}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, status: e.target.value as any }))
                }
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                className="w-full sm:w-auto text-xs justify-center"
                type="button"
                onClick={() => setEmpModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto text-xs justify-center"
                type="submit"
                disabled={isSubmittingEmp}
              >
                {isSubmittingEmp
                  ? "Guardando..."
                  : editingEmpId
                    ? "Guardar cambios"
                    : "Agregar empleado"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Crear / Editar Actor */}
        <Modal
          open={actorModalOpen}
          onOpenChange={setActorModalOpen}
          title={editingActorId ? "Editar actor" : "Agregar actor / personaje"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveActor();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre real del actor"
                id="actor-name-real"
                value={actorForm.name}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Carlos Rivera"
              />
              <Input
                label="Nombre del personaje"
                id="actor-character"
                value={actorForm.characterName}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, characterName: e.target.value }))
                }
                placeholder="Ej: Inspector Morales"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Fotografía del actor / retrato
              </label>
              {actorForm.photoUrl ? (
                <div className="flex items-center gap-4 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/60">
                  <div className="relative w-20 h-28 shrink-0 overflow-hidden rounded-lg border border-grayscale-4 shadow-sm bg-grayscale-3">
                    <img
                      src={actorForm.photoUrl}
                      alt="Vista previa"
                      className="size-full object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-col justify-between h-28 py-1 min-w-0 flex-1">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-emerald-11 bg-emerald-2/40 border border-green-4/30 px-2 py-0.5 rounded-full inline-block mb-1">
                        Retrato cargado
                      </span>
                      <p className="text-xs font-semibold text-grayscale-12 truncate">
                        Fotografía seleccionada
                      </p>
                      <p className="text-[11px] text-grayscale-8">
                        Optimizada para pantalla
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-1.5 text-xs font-mono font-semibold text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file);
                                setActorForm((f) => ({
                                  ...f,
                                  photoUrl: compressed,
                                }));
                              } catch {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setActorForm((f) => ({
                                    ...f,
                                    photoUrl: reader.result as string,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <PencilSimpleIcon size={14} />
                        <span>Cambiar foto</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setActorForm((f) => ({ ...f, photoUrl: "" }))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-3 bg-red-2/30 px-2.5 py-1.5 text-xs font-mono font-semibold text-red-11 hover:bg-red-3/40 transition-colors cursor-pointer"
                        title="Quitar foto"
                      >
                        <TrashIcon size={14} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-4 bg-grayscale-1 p-6 text-center dark:border-grayscale-5 dark:bg-grayscale-3/40 hover:border-accent-7 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setActorForm((f) => ({ ...f, photoUrl: compressed }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setActorForm((f) => ({
                              ...f,
                              photoUrl: reader.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />
                  <ImageSquareIcon size={32} className="text-accent-9 mb-1.5" />
                  <p className="text-xs font-bold text-grayscale-12">
                    Subir foto de retrato del actor
                  </p>
                  <p className="text-[11px] text-grayscale-8 mt-0.5">
                    Haz clic o arrastra un archivo JPG, PNG o WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Biografía / ficha técnica del personaje
              </label>
              <textarea
                value={actorForm.characterBio}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, characterBio: e.target.value }))
                }
                placeholder="Detalles sobre la psicología del personaje, contexto en la trama o llamado de rodaje..."
                rows={3}
                className="w-full rounded-xl border border-grayscale-4 bg-grayscale-1 p-3 text-xs text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Teléfono"
                id="actor-phone"
                value={actorForm.phone}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+506 8700-0000"
              />
              <Input
                label="Correo electrónico"
                id="actor-email"
                type="email"
                value={actorForm.email}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="actor@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha de nacimiento"
                id="actor-birthdate"
                type="date"
                value={actorForm.birthDate}
                onChange={(e) =>
                  setActorForm((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
              <Input
                label="Capítulos de participación"
                id="actor-episodes"
                type="number"
                value={actorForm.episodeCount}
                onChange={(e) =>
                  setActorForm((f) => ({
                    ...f,
                    episodeCount: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                className="w-full sm:w-auto text-xs justify-center"
                type="button"
                onClick={() => setActorModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-auto text-xs justify-center"
                type="submit"
                disabled={isSubmittingActor}
              >
                {isSubmittingActor
                  ? "Guardando..."
                  : editingActorId
                    ? "Guardar cambios"
                    : "Agregar actor"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Crear / Editar Persona Interesada */}
        <Modal
          open={leadModalOpen}
          onOpenChange={setLeadModalOpen}
          title={
            editingLeadId
              ? "Editar persona interesada"
              : "Registrar persona interesada en grabar"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveLead();
            }}
            className="flex flex-col gap-4"
          >
            <Input
              label="Nombre completo (opcional)"
              id="lead-name"
              value={leadForm.name}
              onChange={(e) =>
                setLeadForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Mario Alvarado"
            />

            {/* Fotografía de la persona interesada */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Fotografía de la persona / retrato (opcional)
              </label>
              {leadForm.photoUrl ? (
                <div className="flex items-center gap-4 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/60">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewLeadPhoto({
                        url: leadForm.photoUrl,
                        name: leadForm.name || "Fotografía seleccionada",
                        phone: leadForm.phone,
                        description: leadForm.description,
                      })
                    }
                    className="group/leadthumb relative w-20 h-24 shrink-0 overflow-hidden rounded-lg border border-grayscale-4 shadow-sm bg-grayscale-3 cursor-pointer transition-transform hover:scale-102 active:scale-98 focus:outline-none focus:ring-2 focus:ring-accent-8"
                    title="Ver foto en grande"
                  >
                    <img
                      src={leadForm.photoUrl}
                      alt="Vista previa"
                      className="size-full object-cover object-center transition-opacity group-hover/leadthumb:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/leadthumb:opacity-100 transition-opacity">
                      <MagnifyingGlassIcon
                        size={18}
                        weight="bold"
                        className="text-white drop-shadow"
                      />
                    </div>
                  </button>
                  <div className="flex flex-col justify-between h-24 py-1 min-w-0 flex-1">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-emerald-11 bg-emerald-2/40 border border-green-4/30 px-2 py-0.5 rounded-full inline-block mb-1">
                        Foto cargada
                      </span>
                      <p className="text-xs font-semibold text-grayscale-12 truncate">
                        Fotografía seleccionada
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-1.5 text-xs font-mono font-semibold text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file);
                                setLeadForm((f) => ({
                                  ...f,
                                  photoUrl: compressed,
                                }));
                              } catch {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setLeadForm((f) => ({
                                    ...f,
                                    photoUrl: reader.result as string,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <PencilSimpleIcon size={14} />
                        <span>Cambiar foto</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setLeadForm((f) => ({ ...f, photoUrl: "" }))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-3 bg-red-2/30 px-2.5 py-1.5 text-xs font-mono font-semibold text-red-11 hover:bg-red-3/40 transition-colors cursor-pointer"
                        title="Quitar foto"
                      >
                        <TrashIcon size={14} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-4 bg-grayscale-1 p-5 text-center dark:border-grayscale-5 dark:bg-grayscale-3/40 hover:border-accent-7 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setLeadForm((f) => ({ ...f, photoUrl: compressed }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setLeadForm((f) => ({
                              ...f,
                              photoUrl: reader.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />
                  <ImageSquareIcon size={28} className="text-accent-9 mb-1" />
                  <p className="text-xs font-bold text-grayscale-12">
                    Subir foto de la persona interesada
                  </p>
                  <p className="text-[11px] text-grayscale-8 mt-0.5">
                    Haz clic o arrastra un archivo JPG, PNG o WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Número de teléfono / WhatsApp (opcional)"
                id="lead-phone"
                value={leadForm.phone}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+506 8800-0000"
              />

              <Select
                label="Estado de evaluación"
                id="lead-status"
                value={leadForm.status}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, status: e.target.value as any }))
                }
                options={[
                  { value: "nuevo", label: "Nuevo interesado" },
                  { value: "contactado", label: "Contactado" },
                  { value: "evaluado", label: "Evaluado / Prueba realizada" },
                  { value: "descartado", label: "Descartado" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Correo electrónico (opcional)"
                id="lead-email"
                type="email"
                value={leadForm.email}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="contacto@ejemplo.com"
              />

              <Input
                label="Fecha de nacimiento (opcional)"
                id="lead-birthdate"
                type="date"
                value={leadForm.birthDate}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lead-desc"
                className="text-xs font-medium text-grayscale-11"
              >
                Descripción / detalles del perfil
              </label>
              <textarea
                id="lead-desc"
                rows={3}
                value={leadForm.description}
                onChange={(e) =>
                  setLeadForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Indica experiencia, tipo de voz, disponibilidad, edad, rol de interés o notas del casting..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setLeadModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="text-xs"
                type="submit"
                disabled={isSubmittingLead}
              >
                {isSubmittingLead
                  ? "Guardando..."
                  : editingLeadId
                    ? "Guardar cambios"
                    : "Registrar interesado"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Ficha Completa del Personaje */}
        {selectedFichaActor && (
          <Modal
            open={fichaModalOpen}
            onOpenChange={setFichaModalOpen}
            title="Ficha del personaje"
          >
            <div className="flex flex-col gap-6 pt-1">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="relative w-full sm:w-52 aspect-[3/4] shrink-0 overflow-hidden rounded-2xl border border-grayscale-3 bg-grayscale-2 dark:border-grayscale-4/80 shadow-md">
                  {selectedFichaActor.photoUrl ? (
                    <img
                      src={selectedFichaActor.photoUrl}
                      alt={selectedFichaActor.characterName}
                      className="size-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center font-mono text-3xl font-bold text-accent-11 bg-accent-3">
                      {selectedFichaActor.characterName
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent-10">
                      {selectedFichaActor.characterName}
                    </span>
                    <h2 className="text-xl font-extrabold text-grayscale-12">
                      {selectedFichaActor.name}
                    </h2>
                  </div>

                  {selectedFichaActor.characterBio && (
                    <p className="text-xs text-grayscale-10 leading-relaxed">
                      {selectedFichaActor.characterBio}
                    </p>
                  )}

                  {(() => {
                    const bday = getBirthdayInfo(selectedFichaActor.birthDate);
                    if (!bday) return null;
                    return (
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-11 dark:text-amber-9 mt-1">
                        <CakeIcon
                          size={22}
                          className="shrink-0 text-amber-500"
                        />
                        <div className="flex flex-col text-xs font-mono">
                          <span className="font-bold text-grayscale-12">
                            Cumpleaños: {bday.birthDateFormatted} (
                            {bday.currentAge} años)
                          </span>
                          <span className="text-[11px] text-amber-11 dark:text-amber-9 font-semibold">
                            {bday.detailText}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-grayscale-3 dark:border-grayscale-4 text-xs font-mono">
                    <div>
                      <span className="text-grayscale-9 text-[10px] uppercase block">
                        Teléfono
                      </span>
                      {selectedFichaActor.phone ? (
                        <a
                          href={getWhatsAppLink(selectedFichaActor.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-grayscale-12 hover:text-green-11 hover:underline transition-colors block truncate"
                          title="Abrir chat de WhatsApp"
                        >
                          {selectedFichaActor.phone}
                        </a>
                      ) : (
                        <span className="font-bold text-grayscale-12 block">
                          No especificado
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-grayscale-9 text-[10px] uppercase block">
                        Correo
                      </span>
                      <span className="font-bold text-grayscale-12 truncate block">
                        {selectedFichaActor.email || "No especificado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
        {/* Modal Vista Foto en Grande de Interesado */}
        <Modal
          open={!!previewLeadPhoto}
          onOpenChange={(open) => !open && setPreviewLeadPhoto(null)}
          title={previewLeadPhoto?.name || "Fotografía"}
          className="max-w-md sm:max-w-xl md:max-w-2xl"
        >
          {previewLeadPhoto && (
            <div className="flex flex-col gap-3">
              <div className="relative w-full max-h-[62vh] sm:max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-grayscale-2/80 dark:bg-grayscale-3/50 border border-grayscale-3 dark:border-grayscale-4 p-2">
                <img
                  src={previewLeadPhoto.url}
                  alt={previewLeadPhoto.name}
                  className="max-h-[58vh] sm:max-h-[66vh] w-auto max-w-full rounded-lg object-contain select-none shadow-sm"
                />
              </div>

              {(previewLeadPhoto.phone || previewLeadPhoto.description) && (
                <div className="flex flex-col gap-2 rounded-xl bg-grayscale-2/60 dark:bg-grayscale-3/40 p-3 border border-grayscale-3/60 dark:border-grayscale-4/60">
                  {previewLeadPhoto.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-grayscale-10 font-mono">
                        Contacto:
                      </span>
                      <a
                        href={getWhatsAppLink(previewLeadPhoto.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent-11 hover:text-green-11 hover:underline transition-colors"
                        title="Abrir chat de WhatsApp"
                      >
                        <PhoneIcon
                          size={13}
                          className="text-accent-9 shrink-0"
                        />
                        <span>{previewLeadPhoto.phone}</span>
                      </a>
                    </div>
                  )}
                  {previewLeadPhoto.description && (
                    <p className="text-xs text-grayscale-11 leading-relaxed border-t border-grayscale-3/40 dark:border-grayscale-4/40 pt-2">
                      {previewLeadPhoto.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Confirm Delete Lead Modal */}
        <ConfirmModal
          open={!!leadToDeleteId}
          onOpenChange={(open) => !open && setLeadToDeleteId(null)}
          title="¿Eliminar Interesado?"
          description="¿Estás seguro de que deseas eliminar a esta persona interesada? Esta acción no se puede deshacer."
          confirmText="Eliminar Persona"
          onConfirm={async () => {
            if (leadToDeleteId) {
              await removeCastingLead({ id: leadToDeleteId as any });
              setLeadToDeleteId(null);
            }
          }}
        />

        {/* Modal Crear / Editar Colaborador Potencial */}
        <Modal
          open={collabModalOpen}
          onOpenChange={setCollabModalOpen}
          title={
            editingCollabId
              ? "Editar colaborador potencial"
              : "Registrar colaborador potencial"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveCollab();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo o marca"
                id="collab-name"
                required
                value={collabForm.name}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Daniel Castillo o Marca X"
              />

              <Input
                label="Área / Especialidad"
                id="collab-area"
                value={collabForm.area}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, area: e.target.value }))
                }
                placeholder="Ej: Creador de contenido, Camarógrafo, etc."
              />
            </div>

            {/* Fotografía del colaborador */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-grayscale-9">
                Fotografía / Logo / Retrato (opcional)
              </label>
              {collabForm.photoUrl ? (
                <div className="flex items-center gap-4 rounded-xl border border-grayscale-3 bg-grayscale-1 p-3 dark:border-grayscale-4 dark:bg-grayscale-3/60">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewLeadPhoto({
                        url: collabForm.photoUrl,
                        name: collabForm.name || "Fotografía seleccionada",
                        phone: collabForm.phone,
                        description: collabForm.description,
                      })
                    }
                    className="group/collabpreview relative w-20 h-24 shrink-0 overflow-hidden rounded-lg border border-grayscale-4 shadow-sm bg-grayscale-3 cursor-pointer transition-transform hover:scale-102 active:scale-98 focus:outline-none focus:ring-2 focus:ring-accent-8"
                    title="Ver foto en grande"
                  >
                    <img
                      src={collabForm.photoUrl}
                      alt="Vista previa"
                      className="size-full object-cover object-center transition-opacity group-hover/collabpreview:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/collabpreview:opacity-100 transition-opacity">
                      <MagnifyingGlassIcon
                        size={18}
                        weight="bold"
                        className="text-white drop-shadow"
                      />
                    </div>
                  </button>
                  <div className="flex flex-col justify-between h-24 py-1 min-w-0 flex-1">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-emerald-11 bg-emerald-2/40 border border-green-4/30 px-2 py-0.5 rounded-full inline-block mb-1">
                        Foto cargada
                      </span>
                      <p className="text-xs font-semibold text-grayscale-12 truncate">
                        Fotografía seleccionada
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-grayscale-3 bg-grayscale-2 px-3 py-1.5 text-xs font-mono font-semibold text-grayscale-11 hover:bg-grayscale-3 transition-colors cursor-pointer dark:border-grayscale-4 dark:bg-grayscale-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file);
                                setCollabForm((f) => ({
                                  ...f,
                                  photoUrl: compressed,
                                }));
                              } catch {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setCollabForm((f) => ({
                                    ...f,
                                    photoUrl: reader.result as string,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <PencilSimpleIcon size={14} />
                        <span>Cambiar foto</span>
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setCollabForm((f) => ({ ...f, photoUrl: "" }))
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-3 bg-red-2/30 px-2.5 py-1.5 text-xs font-mono font-semibold text-red-11 hover:bg-red-3/40 transition-colors cursor-pointer"
                        title="Quitar foto"
                      >
                        <TrashIcon size={14} />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-grayscale-4 bg-grayscale-1 p-5 text-center dark:border-grayscale-5 dark:bg-grayscale-3/40 hover:border-accent-7 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setCollabForm((f) => ({
                            ...f,
                            photoUrl: compressed,
                          }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setCollabForm((f) => ({
                              ...f,
                              photoUrl: reader.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />
                  <ImageSquareIcon size={28} className="text-accent-9 mb-1" />
                  <p className="text-xs font-bold text-grayscale-12">
                    Subir foto o logo del colaborador
                  </p>
                  <p className="text-[11px] text-grayscale-8 mt-0.5">
                    Haz clic o arrastra un archivo JPG, PNG o WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Estado de la alianza"
                id="collab-status"
                value={collabForm.status}
                onChange={(e) =>
                  setCollabForm((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
                options={[
                  { value: "por_contactar", label: "Por contactar" },
                  { value: "en_conversacion", label: "En conversación" },
                  { value: "confirmado", label: "Confirmado / Aliado" },
                  { value: "descartado", label: "Descartado" },
                ]}
              />

              <Input
                label="Número de teléfono / WhatsApp"
                id="collab-phone"
                value={collabForm.phone}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+506 8800-0000"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Correo electrónico (opcional)"
                id="collab-email"
                type="email"
                value={collabForm.email}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="contacto@colaborador.com"
              />

              <Input
                label="Red social / Portafolio / Web"
                id="collab-social"
                value={collabForm.socialLink}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, socialLink: e.target.value }))
                }
                placeholder="Ej: @instagram, canal de YouTube o web"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Fecha de nacimiento (opcional)"
                id="collab-birthdate"
                type="date"
                value={collabForm.birthDate}
                onChange={(e) =>
                  setCollabForm((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="collab-desc"
                className="text-xs font-medium text-grayscale-11"
              >
                Descripción / Notas / Propuesta de colaboración
              </label>
              <textarea
                id="collab-desc"
                rows={3}
                value={collabForm.description}
                onChange={(e) =>
                  setCollabForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Detalla de qué trata la colaboración, aportes, acuerdos o temas pendientes..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setCollabModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="text-xs"
                type="submit"
                disabled={isSubmittingCollab}
              >
                {isSubmittingCollab
                  ? "Guardando..."
                  : editingCollabId
                    ? "Guardar cambios"
                    : "Registrar colaborador"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Collaborator Modal */}
        <ConfirmModal
          open={!!collabToDeleteId}
          onOpenChange={(open) => !open && setCollabToDeleteId(null)}
          title="¿Eliminar Colaborador Potencial?"
          description="¿Estás seguro de que deseas eliminar a este colaborador potencial? Esta acción no se puede deshacer."
          confirmText="Eliminar Colaborador"
          onConfirm={async () => {
            if (collabToDeleteId) {
              await removeCollaborator({ id: collabToDeleteId as any });
              setCollabToDeleteId(null);
            }
          }}
        />

        {/* Modal Crear / Editar Contacto Potencial */}
        <Modal
          open={contactModalOpen}
          onOpenChange={setContactModalOpen}
          title={
            editingContactId
              ? "Editar contacto potencial"
              : "Agregar contacto potencial"
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveContact();
            }}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo o del contacto"
                id="contact-name"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Laura Castro"
                required
              />

              <Input
                label="Organización / Empresa / Colectivo (opcional)"
                id="contact-org"
                value={contactForm.organization}
                onChange={(e) =>
                  setContactForm((f) => ({
                    ...f,
                    organization: e.target.value,
                  }))
                }
                placeholder="Ej: Canal Creativo CR, Marca XYZ"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Categoría o tipo de contacto"
                id="contact-category"
                value={contactForm.category}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, category: e.target.value }))
                }
                options={[
                  { value: "", label: "Seleccionar categoría..." },
                  { value: "Talento / Creador", label: "Talento / Creador" },
                  { value: "Influencer", label: "Influencer" },
                  {
                    value: "Proveedor / Servicio",
                    label: "Proveedor / Servicio",
                  },
                  { value: "Marca / Patrocinio", label: "Marca / Patrocinio" },
                  {
                    value: "Técnico / Especialista",
                    label: "Técnico / Especialista",
                  },
                  { value: "Prensa / Medios", label: "Prensa / Medios" },
                  { value: "General", label: "Contacto general" },
                ]}
              />

              <Select
                label="Estado del contacto"
                id="contact-status"
                value={contactForm.status}
                onChange={(e) =>
                  setContactForm((f) => ({
                    ...f,
                    status: e.target.value as any,
                  }))
                }
                options={[
                  { value: "nuevo", label: "Nuevo" },
                  { value: "en_seguimiento", label: "En seguimiento" },
                  { value: "contactado", label: "Contactado" },
                  { value: "convertido", label: "Convertido" },
                  { value: "descartado", label: "Descartado" },
                ]}
              />
            </div>

            {/* Foto Upload Frame */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-grayscale-11">
                Foto o avatar (opcional)
              </label>
              {contactForm.photoUrl ? (
                <div className="relative flex items-center gap-3 p-2.5 rounded-xl border border-grayscale-4 bg-grayscale-2/40 dark:bg-grayscale-3/40">
                  <img
                    src={contactForm.photoUrl}
                    alt="Vista previa"
                    className="size-14 rounded-lg object-cover border border-grayscale-4"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-grayscale-12 truncate">
                      Foto adjunta
                    </span>
                    <span className="text-[11px] text-green-11 font-medium">
                      Lista para guardar
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    className="text-xs text-red-11 hover:bg-red-3 border-red-5 dark:border-red-4"
                    type="button"
                    onClick={() =>
                      setContactForm((f) => ({ ...f, photoUrl: "" }))
                    }
                  >
                    Eliminar foto
                  </Button>
                </div>
              ) : (
                <div className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-grayscale-4 dark:border-grayscale-5 rounded-xl hover:border-accent-7 transition-colors bg-grayscale-1 dark:bg-grayscale-2/60 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setContactForm((f) => ({
                            ...f,
                            photoUrl: compressed,
                          }));
                        } catch {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setContactForm((f) => ({
                              ...f,
                              photoUrl: (ev.target?.result as string) || "",
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                  />
                  <ImageSquareIcon size={28} className="text-accent-9 mb-1" />
                  <p className="text-xs font-bold text-grayscale-12">
                    Subir foto o logo del contacto
                  </p>
                  <p className="text-[11px] text-grayscale-8 mt-0.5">
                    Haz clic o arrastra un archivo JPG, PNG o WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Número de teléfono / WhatsApp"
                id="contact-phone"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+506 8800-0000"
              />

              <Input
                label="Correo electrónico (opcional)"
                id="contact-email"
                type="email"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="contacto@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Red social / Portafolio / Web"
                id="contact-social"
                value={contactForm.socialLink}
                onChange={(e) =>
                  setContactForm((f) => ({
                    ...f,
                    socialLink: e.target.value,
                  }))
                }
                placeholder="Ej: @instagram o https://..."
              />

              <Input
                label="Fecha de nacimiento (opcional)"
                id="contact-birthdate"
                type="date"
                value={contactForm.birthDate}
                onChange={(e) =>
                  setContactForm((f) => ({ ...f, birthDate: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contact-desc"
                className="text-xs font-medium text-grayscale-11"
              >
                Descripción / Notas / Resumen
              </label>
              <textarea
                id="contact-desc"
                rows={3}
                value={contactForm.description}
                onChange={(e) =>
                  setContactForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Detalla de qué trata el contacto, intereses mutuos, antecedentes o acuerdos..."
                className="w-full rounded-lg border border-grayscale-4 bg-grayscale-1 p-2.5 text-sm text-grayscale-12 placeholder:text-grayscale-8 outline-none transition-colors focus:border-accent-8 dark:border-grayscale-5 dark:bg-grayscale-3 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-grayscale-3 dark:border-grayscale-4">
              <Button
                variant="secondary"
                className="text-xs"
                type="button"
                onClick={() => setContactModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="text-xs"
                type="submit"
                disabled={isSubmittingContact}
              >
                {isSubmittingContact
                  ? "Guardando..."
                  : editingContactId
                    ? "Guardar cambios"
                    : "Registrar contacto"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirm Delete Potential Contact Modal */}
        <ConfirmModal
          open={!!contactToDeleteId}
          onOpenChange={(open) => !open && setContactToDeleteId(null)}
          title="¿Eliminar Contacto Potencial?"
          description="¿Estás seguro de que deseas eliminar este contacto potencial? Esta acción no se puede deshacer."
          confirmText="Eliminar Contacto"
          onConfirm={async () => {
            if (contactToDeleteId) {
              await removePotentialContact({ id: contactToDeleteId as any });
              setContactToDeleteId(null);
            }
          }}
        />
      </div>
    </PageContainer>
  );
}
