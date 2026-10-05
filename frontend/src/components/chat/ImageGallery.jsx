import Icon from '../ui/Icon.jsx'
import { EmptyState, Modal } from '../ui/primitives.jsx'

export function ImageGallery({ images, onSelect }) {
  if (!images.length) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <EmptyState icon="image" title="Your images will appear here">
          Images you attach in chat are collected in this gallery for easy browsing.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Images</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {images.length} {images.length === 1 ? 'image' : 'images'} from your chats this session
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onSelect(image)}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#111] text-left transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-950/20"
            aria-label={`Open image ${image.name}`}
          >
            <img src={image.src} alt={image.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-8 text-xs text-neutral-100">
              {image.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ImageViewer({ image, onClose }) {
  return (
    <Modal open={Boolean(image)} onClose={onClose} size="xl" labelledBy="image-viewer-title">
      {image && (
        <div className="flex flex-col">
          <div className="relative bg-[#0b0b0b] p-3 sm:p-4">
            <button
              type="button"
              data-close
              onClick={onClose}
              aria-label="Close image preview"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              <Icon name="x" size={16} />
            </button>
            <img src={image.src} alt={image.name} className="mx-auto max-h-[70dvh] w-auto rounded-xl object-contain" />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm">
            <p id="image-viewer-title" className="min-w-0 truncate font-medium text-white">{image.name}</p>
            <a
              href={image.src}
              download={image.name}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-200 transition hover:bg-white/[0.09]"
            >
              <Icon name="external" size={13} />
              Save image
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}
