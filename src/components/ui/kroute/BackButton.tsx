import { BORDER, BSHADOW, WHITE } from "@/lib/kroute-tokens";

interface Props {
  onClick?: () => void;
}

export default function BackButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kr-reset"
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: BORDER,
        background: WHITE,
        boxShadow: BSHADOW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      ←
    </button>
  );
}
