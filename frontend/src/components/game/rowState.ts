/** Visual state of a single history-grid row, driving its CSS class (spec §7.3). */
export type RowState = 'val' | 'inc' | 'target-win' | 'target-fail' | 'awaiting' | 'empty';

/** A row to render in the history grid. */
export interface GridRow {
  state: RowState;
  /** Uppercase badge text, e.g. 'VAL 0', 'IS_INC 1', 'TARGET' (filled rows). */
  label?: string;
  /** Result value shown on the right, e.g. '-4', 'Increasing' (filled rows). */
  result?: string;
}

/** Row states that represent a submitted (filled) move. */
export const FILLED_STATES: ReadonlySet<RowState> = new Set([
  'val',
  'inc',
  'target-win',
  'target-fail',
]);
