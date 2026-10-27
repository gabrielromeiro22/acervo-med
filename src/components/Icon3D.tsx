// Ícones 3D do Fluent Emoji (MIT), servidos de public/3d.
// Cada ícone flutua com um atraso derivado do nome, para não andarem todos em sincronia.
export function Icon3D({ name, className = '', still = false }: { name: string; className?: string; still?: boolean }) {
  const delay = -([...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 36) / 10
  return (
    <img src={`${import.meta.env.BASE_URL}3d/${name}.png`} alt="" aria-hidden draggable={false}
      className={`select-none ${still ? '' : 'icon-3d'} ${className}`} style={still ? undefined : { animationDelay: `${delay}s` }} />
  )
}
