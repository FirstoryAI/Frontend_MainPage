import styles from './CtaButton.module.css';

function CtaButton({
  icon,
  pill = false,
  iconOnly = false,
  className = '',
  children,
  ref,
  ...buttonProps
}) {
  const classNames = [
    styles.button,
    pill && styles.pill,
    iconOnly && styles.iconOnly,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classNames} type="button" ref={ref} {...buttonProps}>
      {icon && <img src={icon} alt="" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export default CtaButton;
