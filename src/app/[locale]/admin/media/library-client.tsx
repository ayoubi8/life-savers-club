"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderPlus, MoreVertical, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/ui/confirm";
import { createFolder, deleteFolder, renameFolder } from "@/lib/media/actions";
import { NameDialog } from "./name-dialog";

/** Translates an action error key, with a generic fallback. */
export function useMediaError() {
  const t = useTranslations("adminMedia.errors");
  return (code: string) => (t.has(code) ? t(code) : t("failed"));
}

export function NewFolderButton() {
  const t = useTranslations("adminMedia");
  const errorText = useMediaError();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-tour="media.new-folder"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        <FolderPlus className="h-4 w-4" aria-hidden />
        {t("newFolder")}
      </button>
      <NameDialog
        open={open}
        title={t("newFolder")}
        label={t("folderName")}
        submitLabel={t("create")}
        onClose={() => setOpen(false)}
        onSubmit={async (name) => {
          const result = await createFolder(name);
          if (!result.ok) return errorText(result.error);
          toast.success(t("folderCreated"));
          router.push(`/admin/media/${result.id}`);
          return null;
        }}
      />
    </>
  );
}

export function FolderMenu({ folder, admin }: { folder: { id: string; name: string; files: number }; admin: boolean }) {
  const t = useTranslations("adminMedia");
  const errorText = useMediaError();
  const router = useRouter();
  const confirm = useConfirm();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);

  async function remove() {
    setMenu(false);
    const ok = await confirm({
      title: admin ? t("deleteFolderTitle", { name: folder.name }) : t("requestFolderTitle", { name: folder.name }),
      message: admin ? t("deleteFolderText", { count: folder.files }) : t("requestText"),
      confirmLabel: admin ? t("delete") : t("sendRequest"),
      danger: admin,
    });
    if (!ok) return;
    const result = await deleteFolder(folder.id);
    if (!result.ok) return void toast.error(errorText(result.error));
    if (result.requested) return void toast.success(t("requestSent"));
    toast.success(t("folderDeleted"));
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t("folderActions", { name: folder.name })}
        aria-expanded={menu}
        onClick={() => setMenu((value) => !value)}
        className="rounded-full p-1.5 text-grey hover:bg-muted"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {menu && (
        <>
          <button type="button" aria-hidden tabIndex={-1} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
          <div role="menu" className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-soft">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenu(false);
                setRenaming(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-grey hover:bg-muted"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {t("rename")}
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={remove}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-pink hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("delete")}
            </button>
          </div>
        </>
      )}
      <NameDialog
        open={renaming}
        title={t("renameFolder")}
        label={t("folderName")}
        initialValue={folder.name}
        submitLabel={t("save")}
        onClose={() => setRenaming(false)}
        onSubmit={async (name) => {
          const result = await renameFolder(folder.id, name);
          if (!result.ok) return errorText(result.error);
          toast.success(t("renamed"));
          router.refresh();
          return null;
        }}
      />
    </div>
  );
}

/**
 * Admins only. Switching accounts hides every file stored in the current one, so when the
 * library has files the admin must type the current account's email to continue.
 */
export function ChangeAccountButton({ email, fileCount, connectUrl }: { email: string; fileCount: number; connectUrl: string }) {
  const t = useTranslations("adminMedia");
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  async function start() {
    if (fileCount > 0) return setOpen(true);
    const ok = await confirm({ title: t("changeTitle"), message: t("changeEmpty"), confirmLabel: t("continue") });
    if (ok) window.location.assign(connectUrl);
  }

  return (
    <>
      <button
        type="button"
        data-tour="media.change-account"
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-grey hover:bg-muted"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        {t("changeAccount")}
      </button>
      <NameDialog
        open={open}
        danger
        title={t("changeTitle")}
        description={t("changeWarning", { count: fileCount, email })}
        label={t("changeTypeEmail", { email })}
        submitLabel={t("continue")}
        maxLength={320}
        expected={email}
        onClose={() => setOpen(false)}
        onSubmit={async () => {
          window.location.assign(connectUrl);
          return null;
        }}
      />
    </>
  );
}
