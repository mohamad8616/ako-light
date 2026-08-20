import { EASE } from '@/utility/HomepageSection'
import React from 'react'
import { motion } from 'framer-motion'

const UnderLineEffect = ({hovered}:{hovered:boolean}) => {
  return (
     <motion.span
            initial={{ right: "0%", width: "100%" }}
            animate={
              hovered
                ? {
                    right: ["100%", "0%", "0%"],
                    width: ["0%", "100%", "100%"],
                  }
                : { right: "0%", width: "0%" }
            }
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute -bottom-1 h-[0.5px] bg-background-secondary"
          />
  )
}

export default UnderLineEffect