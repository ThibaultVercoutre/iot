export type TimePeriod = '1h' | '3h' | '6h' | '12h' | 'day' | 'week' | 'month';

/**
 * Convertit une période en nombre d'heures
 */
export const getPeriodInHours = (period: TimePeriod): number => {
  switch(period) {
    case '1h': return 1;
    case '3h': return 3;
    case '6h': return 6;
    case '12h': return 12;
    case 'day': return 24;
    case 'week': return 24 * 7;
    case 'month': return 24 * 30;
    default: return 24;
  }
};

/**
 * Obtient le libellé d'une période (singulier)
 */
export const getPeriodLabel = (period: TimePeriod, offset: number = 0): { label: string, finalOffset: number } => {
  switch(period) {
    case '1h':
    case '3h':
    case '6h':
    case '12h':
      return { label: 'heure', finalOffset: offset };
    case 'day':
      return { label: 'jour', finalOffset: offset / 24 };
    case 'week':
      return { label: 'semaine', finalOffset: offset / 24 / 7 };
    case 'month':
      return { label: 'mois', finalOffset: offset / 24 / 30 };
    default:
      return { label: 'période', finalOffset: offset };
  }
};

/**
 * Détermine si une période est en heures
 */
export const isPeriodInHours = (period: TimePeriod): boolean => {
  return ['1h', '3h', '6h', '12h'].includes(period);
};

/**
 * Obtient le libellé pluriel avec le count correct
 */
export const getPeriodLabelWithCount = (period: TimePeriod, count: number): string => {
  const label = getPeriodLabel(period);
  
  // Les périodes en heures
  if (isPeriodInHours(period)) {
    return count > 1 ? `${count} heures` : `${count} heure`;
  }
  
  // Cas spécial pour "mois" (invariable)
  if (period === 'month') {
    return count > 1 ? `${count} mois` : `${count} mois`;
  }
  
  // Autres cas (jour, semaine)
  return count > 1 ? `${count} ${label}s` : `${count} ${label}`;
};

/**
 * Format pour l'affichage du décalage temporel
 */
export const formatTimeOffset = (period: TimePeriod, offset: number): string => {
  if (offset === 0) return '';
  
  const absOffset = Math.abs(offset);
  const { label, finalOffset } = getPeriodLabel(period, absOffset);
  const needsPlural = absOffset > 1 && !['month'].includes(period);
  const finalLabel = needsPlural ? `${label}s` : label;
  
  return `(Décalage: ${offset > 0 ? '-' : '+'} ${finalOffset} ${label})`;
}; 