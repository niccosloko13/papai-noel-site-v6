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
      name: "Essencial",
      price: 39.90,
      prop: "As pistas essenciais para transformar a casa na noite de Natal.",
      benefits: ["10 pares de pegadas (20 unidades)","Adesivo para janela","Guia de aplicação"],
      image: "assets/product/kit-essencial-card.svg",
      active: true
    },
    {
      id: "personal",
      name: "Personalizado",
      price: 69.90,
      prop: "Mais pistas e detalhes personalizados para fazer a visita parecer única.",
      benefits: ["18 pares de pegadas (36 unidades)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada"],
      image: "assets/product/kit-personalizado-card.svg",
      badge: "Mais completo",
      active: true
    }
  ]
});
