import styles from "@/app/home.module.css";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <section className={styles.categories} aria-label="Categories">
      {categories.map((item) => (
        <button
          key={item}
          className={selectedCategory === item ? styles.active : ""}
          onClick={() => onSelectCategory(item)}
        >
          {item}
        </button>
      ))}
    </section>
  );
}
