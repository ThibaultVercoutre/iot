import { TimePeriod } from './time-utils';
import { format, subHours, subDays, subMonths, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Calcule une plage de dates en fonction d'une période et d'un décalage
 */
export function calculateDateRange(period: TimePeriod, timeOffset: number = 0): { 
  startDate: Date,
  endDate: Date,
  displayRange: string 
} {
  // Date de référence (fin de période)
  const endDate = timeOffset > 0 
    ? subHours(new Date(), timeOffset) 
    : new Date();
  
  // Date de début selon la période
  let startDate: Date;
  
  switch(period) {
    case '1h':
      startDate = subHours(endDate, 1);
      break;
    case '3h':
      startDate = subHours(endDate, 3);
      break;
    case '6h':
      startDate = subHours(endDate, 6);
      break;
    case '12h':
      startDate = subHours(endDate, 12);
      break;
    case 'day':
      startDate = subDays(endDate, 1);
      break;
    case 'week':
      startDate = subDays(endDate, 7);
      break;
    case 'month':
      startDate = subMonths(endDate, 1);
      break;
    default:
      startDate = subDays(endDate, 1); // Par défaut 24h
  }
  
  // Créer un libellé pour l'affichage
  const displayRange = formatDateRange(startDate, endDate);
  
  return { startDate, endDate, displayRange };
}

/**
 * Calcule les paramètres de date pour la prochaine période ou la précédente
 */
export function getOffsetDateParams(period: TimePeriod, currentOffset: number, direction: 'next' | 'prev'): {
  newOffset: number;
  canNavigate: boolean;
} {
  // Calcul du nouvel offset
  const newOffset = direction === 'prev' 
    ? currentOffset + 1 
    : currentOffset - 1;
  
  // Empêcher d'aller dans le futur
  const canNavigate = direction === 'prev' || newOffset >= 0;
  
  return {
    newOffset: canNavigate ? newOffset : currentOffset,
    canNavigate
  };
}

/**
 * Formate une plage de dates pour l'affichage
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  // Format court pour l'affichage dans les composants
  const startFormatted = format(startDate, 'dd/MM HH:mm', { locale: fr });
  const endFormatted = format(endDate, 'dd/MM HH:mm', { locale: fr });
  
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Formate une date relative pour un affichage convivial
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  return formatDistance(date, now, { 
    addSuffix: true,
    locale: fr 
  });
}

/**
 * Génère une URL avec les paramètres de date encodés
 */
export function buildDateRangeUrl(baseUrl: string, startDate: Date, endDate: Date): string {
  const params = new URLSearchParams();
  params.append('startDate', startDate.toISOString());
  params.append('endDate', endDate.toISOString());
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Convertit une période en millisecondes
 */
export function periodToMs(period: TimePeriod): number {
  const hours = getPeriodHours(period);
  return hours * 60 * 60 * 1000;
}

/**
 * Obtient le nombre d'heures pour une période donnée
 */
export function getPeriodHours(period: TimePeriod): number {
  switch(period) {
    case '1h': return 1;
    case '3h': return 3;
    case '6h': return 6;
    case '12h': return 12;
    case 'day': return 24;
    case 'week': return 24 * 7;
    case 'month': return 24 * 30; // Approximation
    default: return 24;
  }
} 