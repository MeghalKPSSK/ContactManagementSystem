import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faAnglesLeft, faAnglesRight, faRotate } from '@fortawesome/free-solid-svg-icons';
import styles from './PaginationBar.module.css';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const MAX_VISIBLE_PAGES = 5;

interface PaginationBarProps {
  current: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onRefresh?: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function PaginationBar({
  current,
  pageSize,
  total,
  disabled = false,
  onRefresh,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const totalPages = Math.ceil(total / pageSize);
  const safeCurrent = Math.min(Math.max(current, 1), Math.max(totalPages, 1));
  const startPage = Math.max(1, Math.min(safeCurrent - Math.floor(MAX_VISIBLE_PAGES / 2), totalPages - MAX_VISIBLE_PAGES + 1));
  const endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
  const pages = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, index) => startPage + index);
  const firstEntry = total === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const lastEntry = Math.min(safeCurrent * pageSize, total);

  return (
    <div className={styles.paginationBar}>
      <div className={styles.refreshArea}>
        {onRefresh && (
          <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={disabled} title="Refresh list" aria-label="Refresh list">
            <FontAwesomeIcon icon={faRotate} />
          </button>
        )}
      </div>

      <div className={styles.navigationCluster}>
        <nav className={styles.pageControls} aria-label="Pagination">
          <button type="button" onClick={() => onPageChange(1)} disabled={disabled || safeCurrent <= 1} title="First page" aria-label="First page">
            <FontAwesomeIcon icon={faAnglesLeft} />
          </button>
          <button type="button" onClick={() => onPageChange(safeCurrent - 1)} disabled={disabled || safeCurrent <= 1} title="Previous page" aria-label="Previous page">
            <FontAwesomeIcon icon={faAngleLeft} />
          </button>
          {pages.map((page) => (
            <button
              type="button"
              key={page}
              className={page === safeCurrent ? styles.activePage : undefined}
              onClick={() => onPageChange(page)}
              disabled={disabled}
              aria-current={page === safeCurrent ? 'page' : undefined}
            >
              {page}
            </button>
          ))}
          <button type="button" onClick={() => onPageChange(safeCurrent + 1)} disabled={disabled || safeCurrent >= totalPages} title="Next page" aria-label="Next page">
            <FontAwesomeIcon icon={faAngleRight} />
          </button>
          <button type="button" onClick={() => onPageChange(totalPages)} disabled={disabled || safeCurrent >= totalPages} title="Last page" aria-label="Last page">
            <FontAwesomeIcon icon={faAnglesRight} />
          </button>
        </nav>
        <select
          className={styles.pageSizeSelect}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          disabled={disabled}
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <span className={styles.pageInfo}>
        Page {safeCurrent} of {Math.max(totalPages, 1)} - Showing {firstEntry}-{lastEntry} of {total}
      </span>
    </div>
  );
}