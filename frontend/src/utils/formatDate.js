export function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr || "";

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
