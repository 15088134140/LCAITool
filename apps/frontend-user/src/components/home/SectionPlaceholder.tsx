interface SectionPlaceholderProps {
  title: string;
  description: string;
  icon?: string;
}

export function SectionPlaceholder({ title, description, icon = '🚧' }: SectionPlaceholderProps) {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 py-16 px-8">
          <div className="text-6xl mb-6">{icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
          <p className="text-gray-600 max-w-xl mx-auto">{description}</p>
          <p className="mt-6 text-sm text-gray-400">敬请期待</p>
        </div>
      </div>
    </section>
  );
}
