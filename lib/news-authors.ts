export type NewsAuthorPerson = {
  id: string;
  name: string;
  role: string;
  cmsPhoto: string;
  photo: string;
};

export const NEWS_AUTHORS: NewsAuthorPerson[] = [
  {
    id: "fabian",
    name: "Fabián Acuña",
    role: "Director General",
    cmsPhoto: "/news-authors/fabian.jpg",
    photo: "/assets/images/Team/Fabian.jpg",
  },
  {
    id: "eymar",
    name: "Eymar Ortiz",
    role: "Producción audiovisual",
    cmsPhoto: "/news-authors/eymar.jpg",
    photo: "/assets/images/Team/Eymar.jpg",
  },
  {
    id: "kirian",
    name: "Kirian Luna",
    role: "Ingeniería y web",
    cmsPhoto: "/news-authors/kirian.jpg",
    photo: "/assets/images/Team/Kirian.jpg",
  },
];

export function findNewsAuthor(author: {
  id?: string;
  name?: string;
}): NewsAuthorPerson | undefined {
  const id = author.id?.trim().toLowerCase();
  if (id) {
    const byId = NEWS_AUTHORS.find((person) => person.id === id);
    if (byId) return byId;
  }

  const name = author.name?.trim().toLowerCase();
  if (!name) return undefined;

  return NEWS_AUTHORS.find((person) => {
    const full = person.name.toLowerCase();
    return (
      full === name ||
      full.includes(name) ||
      name.includes(person.id) ||
      name.includes(full.split(" ")[0])
    );
  });
}
