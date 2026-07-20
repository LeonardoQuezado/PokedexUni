import { colorForType } from '../types';

export default function TypeBadge({ type }) {
  return (
    <span className="type-badge" style={{ backgroundColor: colorForType(type) }}>
      {type}
    </span>
  );
}
