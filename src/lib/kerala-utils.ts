import { KERALA_WEEKLY_SCHEMES, type KeralaSchemeInfo } from '../data/schemes';

export function getISTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 3600000);
}

export function getISTDateString(d: Date = getISTNow()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayKeralaScheme(d: Date = getISTNow()): KeralaSchemeInfo {
  const dayOfWeek = d.getDay(); // 0-6
  return KERALA_WEEKLY_SCHEMES[dayOfWeek] || KERALA_WEEKLY_SCHEMES[1];
}

export function getYesterdayKeralaScheme(d: Date = getISTNow()): KeralaSchemeInfo {
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayOfWeek = yesterday.getDay(); // 0-6
  return KERALA_WEEKLY_SCHEMES[dayOfWeek] || KERALA_WEEKLY_SCHEMES[0];
}

export function getKeralaDrawCountdown(istDate: Date = getISTNow()): {
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isPast: boolean;
  totalSecondsRemaining: number;
} {
  const h = istDate.getHours();
  const m = istDate.getMinutes();
  const s = istDate.getSeconds();
  const totalSecNow = h * 3600 + m * 60 + s;

  // Draw scheduled for 3:00 PM (15:00 IST = 54000 seconds)
  const drawTargetSec = 15 * 3600;

  // Live drawing active window: 2:55 PM to 3:30 PM (14:55 to 15:30)
  if (totalSecNow >= 14 * 3600 + 55 * 60 && totalSecNow <= 15 * 3600 + 30 * 60) {
    return { hours: 0, minutes: 0, seconds: 0, isLive: true, isPast: false, totalSecondsRemaining: 0 };
  }

  // If past 3:30 PM
  if (totalSecNow > 15 * 3600 + 30 * 60) {
    return { hours: 0, minutes: 0, seconds: 0, isLive: false, isPast: true, totalSecondsRemaining: 0 };
  }

  const remaining = Math.max(0, drawTargetSec - totalSecNow);
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return { hours, minutes, seconds, isLive: false, isPast: false, totalSecondsRemaining: remaining };
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export const formatIndianRupees = formatINR;

export function cleanTicketNumber(input: string): { series: string; number: string; full: string } {
  const cleaned = input.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const m = cleaned.match(/^([A-Z]{1,3})?(\d{4,6})$/);
  if (m) {
    return {
      series: m[1] || '',
      number: m[2] || '',
      full: m[1] ? `${m[1]} ${m[2]}` : m[2]
    };
  }
  return { series: '', number: cleaned, full: cleaned };
}
