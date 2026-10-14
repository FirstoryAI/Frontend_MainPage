import styles from './Chip.module.css';

// tone="green"은 수정 모달처럼 선택하면 초록 테두리로 보여주는 칩이에요.
function Chip({ type = 'radio', tone, checked, onChange, children, ...inputProps }) {
  const selectedClass = tone === 'green' ? styles.selectedGreen : styles.selected;

  return (
    <label className={`${styles.chip} ${checked ? selectedClass : ''}`}>
      <input
        className={styles.input}
        type={type}
        checked={checked}
        onChange={onChange}
        {...inputProps}
      />
      {children}
    </label>
  );
}

export default Chip;
