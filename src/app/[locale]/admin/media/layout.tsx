import { UploadProvider } from "./upload-queue";

/** Keeps the upload queue alive while moving between folders and filters. */
export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return <UploadProvider>{children}</UploadProvider>;
}
