const UnderLineEffect = ({duration = '500',color="bg-background-secondary"}:{duration?:string,color?:string}) => {
  return (
    <span className={` absolute -bottom-1 left-0 h-[0.5px] w-full origin-right scale-x-0 transition-transform duration-${duration} ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:origin-left group-hover:scale-x-100 ${color}`} />
  );
};

export default UnderLineEffect;
