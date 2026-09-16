
export default function SideButton({label, icon, n, onClick}: {label: string, icon: string, n?: string, onClick?: any}) {
  return (
    <button onClick={onClick}>
        <span className="material-icons-round">{ icon }</span>{ label } {" "}
        <em>{ n }</em>
    </button>
  )
}