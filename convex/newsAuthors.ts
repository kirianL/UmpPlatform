export const NEWS_AUTHORS = [
  {
    id: "fabian",
    name: "Fabián Acuña",
    photo: "/assets/images/Team/Fabian.jpg",
  },
  {
    id: "eymar",
    name: "Eymar Ortiz",
    photo: "/assets/images/Team/Eymar.jpg",
  },
  {
    id: "kirian",
    name: "Kirian Luna",
    photo: "/assets/images/Team/Kirian.jpg",
  },
] as const;

export function resolveNewsAuthor(author: { id?: string; name: string }) {
  const id = author.id?.trim().toLowerCase();
  if (id) {
    const byId = NEWS_AUTHORS.find((person) => person.id === id);
    if (byId) return byId;
  }

  const name = author.name.trim().toLowerCase();
  if (!name) return undefined;

  return NEWS_AUTHORS.find((person) => {
    const full = person.name.toLowerCase();
    return full === name || full.startsWith(name) || name.startsWith(full);
  });
}
