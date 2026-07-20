export default function CreatureImage({ creature, size = 'normal' }) {
  if (creature.imageUrl) {
    return (
      <img
        className={`creature-img ${size}`}
        src={creature.imageUrl}
        alt={creature.name}
      />
    );
  }

  const initial = creature.name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className={`creature-placeholder ${size}`} aria-label={`${creature.name} (sem foto ainda)`}>
      <span>{initial}</span>
    </div>
  );
}
