import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { motion } from "framer-motion";
const MenuBtns = ({onClose}: { onClose: () => void }) => {
      const { t, lang, setLang } = useLanguage();
    
  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 items-center gap-x-10 px-8 pb-10 md:px-20 md:pb-12 lg:grid-cols-4">
      {/* Language switcher sits under the first (Company) column */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.85 }}
        className="flex flex-col gap-1.5"
      >
        <button
          onClick={() => setLang("en")}
          className={`w-fit cursor-pointer text-left text-sm font-medium tracking-[0.08em] uppercase transition-colors duration-300 ${
            lang === "en" ? "text-white" : "text-white/30 hover:text-white/60"
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLang("fa")}
          className={`w-fit cursor-pointer text-left text-sm font-medium tracking-[0.08em] transition-colors duration-300 ${
            lang === "fa" ? "text-white" : "text-white/30 hover:text-white/60"
          }`}
        >
          فارسی
        </button>
      </motion.div>

      {/* Spacers so Credits lands in the Network column's track */}
      <div className="hidden lg:block" />
      <div className="hidden lg:block" />
      <div className="hidden lg:block" />

    </div>
  );
};

export default MenuBtns;
