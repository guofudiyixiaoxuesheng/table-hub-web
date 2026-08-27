import { ThunderboltFilled } from "@ant-design/icons";
import styles from "./workspace-shell.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark}>
        <ThunderboltFilled />
      </span>
      {!compact && (
        <span>
          <strong>TableHub</strong>
          <small>门店智能工作台</small>
        </span>
      )}
    </div>
  );
}
