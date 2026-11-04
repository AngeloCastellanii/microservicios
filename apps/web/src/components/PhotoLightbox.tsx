import { useEffect } from "react";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export function PhotoLightbox({ src, alt = "", onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lightbox-root" role="presentation">
      <button
        type="button"
        className="lightbox-backdrop"
        aria-label="Cerrar foto"
        onClick={onClose}
      />
      <div className="lightbox-panel" role="dialog" aria-modal="true">
        <button type="button" className="btn ghost sm lightbox-close" onClick={onClose}>
          Cerrar
        </button>
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}
