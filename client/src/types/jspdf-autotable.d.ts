/**
 * Type definitions for jspdf-autotable
 * Provides proper type augmentation for the jsPDF library with autoTable plugin
 */

import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    /**
     * Adds a table to the PDF document
     * @param options Configuration options for the table
     */
    autoTable: (options: AutoTableOptions) => jsPDF;
  }
}

/**
 * Configuration options for the autoTable function
 */
interface AutoTableOptions {
  /** Start Y position on the page */
  startY?: number;
  /** Table header row definition */
  head?: any[][];
  /** Table body rows definition */
  body?: any[][];
  /** Table footer rows definition */
  foot?: any[][];
  /** Table theme (e.g., 'striped', 'grid', 'plain') */
  theme?: string;
  /** Styles for the header cells */
  headStyles?: {
    /** Fill color in RGB format */
    fillColor?: number[];
    /** Text color (0-255) */
    textColor?: number;
    /** Font style */
    fontStyle?: string;
    /** Cell padding */
    cellPadding?: number;
    /** Custom styles */
    [key: string]: any;
  };
  /** Styles for body cells */
  bodyStyles?: {
    /** Custom styles */
    [key: string]: any;
  };
  /** Styles for alternating rows */
  alternateRowStyles?: {
    /** Custom styles */
    [key: string]: any;
  };
  /** Margin settings for the table */
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Table column settings */
  columns?: Array<{
    /** Column header */
    header?: string;
    /** Data key */
    dataKey?: string | number;
    /** Column width */
    width?: number;
    /** Cell renderer function */
    cell?: (data: any) => any;
  }>;
  /** Add page break between tables */
  pageBreak?: 'auto' | 'avoid' | 'always';
  /** Column styles by index or key */
  columnStyles?: {
    [key: string | number]: {
      /** Column width */
      cellWidth?: number | 'auto' | 'wrap';
      /** Min cell width */
      minCellWidth?: number;
      /** Max cell width */
      maxCellWidth?: number;
      /** Font style */
      fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
      /** Custom styles */
      [key: string]: any;
    };
  };
  /** Hooks for custom rendering */
  didParseCell?: (data: any) => void;
  willDrawCell?: (data: any) => void;
  didDrawCell?: (data: any) => void;
  didDrawPage?: (data: any) => void;
}