window.STORE_DATA = Object.freeze({
  business: {
    brand: "Kit Papai Noel Passou Aqui",
    whatsapp: "5513974100193",
    phoneDisplay: "(13) 97410-0193"
  },
  pix: {
    enabled: false,
    key: "",
    keyType: "",
    displayName: "",
    receiverName: "",
    city: "SAO PAULO",
    discount: 15
  },
  shipping: {
    mode: "manual",
    flatRate: 0
  },
  products: [
    {
      id: "basic",
      name: "Básico",
      price: 39.90,
      prop: "Para criar a surpresa essencial.",
      benefits: ["10 pegadas adesivas","Adesivo para janela","Guia rápido de aplicação"],
      image: "assets/visuals/kit-basico.svg",
      active: true
    },
    {
      id: "personal",
      name: "Personalizado",
      price: 69.90,
      prop: "A experiência que faz a visita parecer real.",
      benefits: ["20 pegadas adesivas","Adesivo para janela","Placa com nome da criança","Certificado personalizado"],
      image: "assets/visuals/kit-personalizado.svg",
      badge: "Mais escolhido",
      active: true
    },
    {
      id: "premium",
      name: "Premium",
      price: 99.90,
      prop: "A experiência completa para presentear.",
      benefits: ["30 pegadas adesivas","Adesivo para janela","Placa personalizada","Certificado oficial","Guia mágico","Embalagem especial"],
      image: "assets/visuals/kit-premium.svg",
      active: true
    }
  ]
});
