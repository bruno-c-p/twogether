import styles from "@/features/budget/components/app-footer.module.css";

export function AppFooter({ className }: { className?: string } = {}) {
  return (
    <footer
      className={
        className ? `${styles.siteFooter} ${className}` : styles.siteFooter
      }
    >
      <span className={styles.siteFooterBrand}>twogether.</span>
      <span>Orçamento a dois, com leveza.</span>
    </footer>
  );
}
