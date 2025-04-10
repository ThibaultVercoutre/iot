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
export const getPeriodLabel = (period: TimePeriod): string => {
  switch(period) {
    case '1h':
    case '3h':
    case '6h':
    case '12h':
      return 'heure';
    case 'day':
      return 'jour';
    case 'week':
      return 'semaine';
    case 'month':
      return 'mois';
    default:
      return 'période';
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
  const periodLabel = getPeriodLabel(period);
  const needsPlural = absOffset > 1 && !['month'].includes(period);
  const label = needsPlural ? `${periodLabel}s` : periodLabel;
  
  return `(Décalage: ${offset > 0 ? '-' : '+'} ${absOffset} ${label})`;
}; 