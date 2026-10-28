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
      benefits: ["6 pares + 1 pegada solta (13 pegadas)","Adesivo para janela","Carta padrão","Certificado padrão","Guia de aplicação"],
      image: "assets/product/kit1-site.webp",
      active: true
    },
    {
      id: "personal",
      name: "Personalizado",
      price: 69.90,
      prop: "Tudo do Essencial, com mais pegadas e a experiência personalizada com o nome da criança.",
      benefits: ["10 pares + 1 pegada solta (21 pegadas)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada","Guia de aplicação"],
      image: "assets/product/kit-personalizado.webp",
      badge: "Mais desejado",
      active: true
    }
  ]
});
