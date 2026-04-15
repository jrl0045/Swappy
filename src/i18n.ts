export type Lang = 'en' | 'es';

export const translations = {
  en: {
    // Navbar
    searchPlaceholder: "Search items to rent...",
    listAnItem: "List an Item",
    
    // Hero
    accessOverOwnership: "Access over ownership",
    heroTitle1: "You don't need to buy it.",
    heroTitle2: "Just rent it.",
    heroSubtitle: "Rent everyday objects from people near you. Tools, cameras, camping gear — anything you need, without buying.",
    heroSearch: "What do you need to rent?",
    
    // Categories  
    catAll: "All",
    catTools: "Tools",
    catCamping: "Camping",
    catElectronics: "Electronics",
    catKitchen: "Kitchen",
    catSports: "Sports",
    catGarden: "Garden",
    catPhotography: "Photography",
    
    // Feed
    allItemsNearYou: "All items near you",
    available: "Available",
    rented: "Rented",
    rentNow: "Rent now",
    perDay: "/ day",
    rentals: "rentals",
    
    // Item Detail
    backToMarketplace: "Back to marketplace",
    aboutThisItem: "About this item",
    whatsIncluded: "What's included",
    aboutTheOwner: "About the owner",
    verified: "Verified",
    memberSince: "Member since",
    responseRate: "Response rate",
    reviews: "reviews",
    contact: "Contact",
    rentThisItem: "Rent this item",
    notAvailable: "Not available",
    availableForRent: "Available for rent",
    currentlyRented: "Currently rented",
    safeRentalGuaranteed: "Safe rental guaranteed",
    safeRentalDescription: "Every rental is protected by Swappy. Your deposit is held securely, and items are insured against damage.",
    today: "Today",
    unavailable: "Unavailable",
    
    // Calendar
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dayNamesShort: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    
    // Rental Modal
    rentThisItemModal: "Rent this item",
    selectYourDates: "Select your rental dates",
    rentalPeriod: "Rental period",
    startDate: "Start date",
    endDate: "End date",
    selectStartDate: "Select start date",
    selectEndDate: "Select end date",
    
    // Insurance add-ons
    insuranceAddons: "Protection plans",
    basicProtection: "Basic Protection",
    basicProtectionDesc: "Covers minor scratches and wear",
    fullProtection: "Full Protection",
    fullProtectionDesc: "Covers accidental damage & theft",
    premiumProtection: "Premium Protection",
    premiumProtectionDesc: "Full coverage + express replacement",
    noProtection: "No protection",
    recommended: "Recommended",
    
    // Price breakdown
    protectionFee: "Protection fee",
    serviceFee: "Service fee",
    total: "Total",
    day: "day",
    days: "days",
    
    // Payment
    proceedToPayment: "Proceed to payment",
    paymentDetails: "Payment details",
    cardNumber: "Card number",
    expiryDate: "Expiry date",
    cvv: "CVV",
    cardHolder: "Card holder",
    billingAddress: "Billing address",
    confirmAndPay: "Confirm & pay",
    back: "Back",
    cancel: "Cancel",
    requestRental: "Request rental",
    orderSummary: "Order summary",
    paymentSecure: "Your payment is secured with 256-bit encryption",
    
    // Success
    rentalConfirmed: "Rental confirmed!",
    rentalConfirmedDesc: "Your payment has been processed. You'll receive a confirmation email shortly.",
    paymentProcessed: "Payment processed",
    
    // Contact Modal
    contactSeller: "Contact seller",
    sendMessage: "Send message",
    messagePlaceholder: "Hi! I'm interested in renting this item. Is it available for...?",
    typicallyResponds: "Typically responds within",
    hours: "hours",
    messageSent: "Message sent!",
    messageSentDesc: "will get back to you shortly.",
    
    // Profile
    editProfile: "Edit Profile",
    activeListings: "Active Listings",
    totalRentals: "Total Rentals",
    responseRateLabel: "Response Rate",
    rentalHistory: "Rental History",
    
    // Language
    language: "Language",
    english: "English",
    spanish: "Español",

    // List Item Modal
    listItemTitle: "List a new item",
    listItemSubtitle: "Share your items with the community",
    itemTitle: "Item title",
    itemTitlePlaceholder: "e.g. Bosch Professional Drill",
    itemDescription: "Description",
    itemDescriptionPlaceholder: "Describe your item, condition, and what's included...",
    pricePerDayLabel: "Price per day (€)",
    pricePlaceholder: "15",
    categoryLabel: "Category",
    selectCategory: "Select a category",
    locationLabel: "Location",
    locationPlaceholder: "e.g. Madrid, Centro",
    addPhotos: "Add photos",
    addPhotosDesc: "Click to upload or drag and drop",
    publishItem: "Publish item",
    itemPublished: "Item published!",
    itemPublishedDesc: "Your item is now live on the marketplace.",

    // Messages
    messages: "Messages",
    noMessages: "No messages yet",
    noMessagesDesc: "When you contact a seller or receive a message, it will appear here.",
    you: "You",
    askingAbout: "Asking about:",
    writeMessage: "Write a message...",
    itemLabel: "ITEM:",

    // Notifications
    notifications: "Notifications",
    noNotifications: "No notifications",
    noNotificationsDesc: "You're all caught up! New activity will appear here.",
    close: "Close",
    pendingRequests: "Pending Requests",
    noPendingRequests: "No pending requests",
    noPendingRequestsDesc: "When someone wants to rent your items, it will appear here.",
    accept: "Accept",
    reject: "Reject",
    wantsToRent: "wants to rent",

    // Auth
    login: "Log In",
    register: "Sign Up",
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    loginSubtitle: "Log in to your account to continue swapping.",
    registerSubtitle: "Join the Swappy community and start renting.",
    fullName: "Full name",
    fullNamePlaceholder: "John Doe",
    email: "Email",
    emailPlaceholder: "you@email.com",
    password: "Password",
    processing: "Processing...",
    enter: "Log In",
    completeRegistration: "Complete Registration",
    checkEmailConfirmation: "Check your email to confirm your account.",
    logOut: "Log out",

    // Rentals (MyRentals)
    statusConfirmed: "Confirmed",
    statusActive: "Active",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    statusPending: "Pending",
    insuranceNone: "No protection",
    insuranceBasic: "Basic",
    insuranceFull: "Full",
    insurancePremium: "Premium",
    noRequests: "No requests",
    noRequestsDesc: "When someone wants to rent your items, they'll appear here.",
    noRentals: "You have no rentals",
    noRentalsDesc: "When you rent an item, it will appear here for tracking.",
    requestedBy: "Requested by:",
    rentedFrom: "Rented from:",
    myRequests: "My Requests",
    incomingRequests: "Incoming Requests",
    myRentals: "My Rentals",

    // Profile extras
    locationNotSet: "Location not set",
    noBio: "No bio — edit your profile to add one",
    reviewsTabTitle: "Reviews",
    reviewsTabEmpty: "Reviews for your items will appear here.",

    // Feed extras
    loadingItems: "Loading items...",
    retry: "Retry",

    // ItemDetail reviews
    ratings: "Ratings",
    leaveRating: "Leave your rating",
    shareExperience: "Share your experience... (optional)",
    ratingSent: "Rating sent!",
    send: "Send",
    reviewOnlyAfterRental: "You can only leave a review once you have rented this product and the period has ended.",
    loginToReview: "Log in to leave a rating.",
    noRatingsYet: "No ratings yet. Be the first!",

    // Public profile
    viewProfile: "View profile",
    sendMessageTo: "Send message",
    userListings: "Listings",
    backToItem: "Back",
    contactUser: "Contact",

    // Follows & Likes
    follow: "Follow",
    following: "Following",
    unfollow: "Unfollow",
    followers: "followers",
    followingCount: "following",
    favorites: "Favorites",
    noFavorites: "No favorites yet",
    noFavoritesDesc: "Tap the heart on items you like and they'll appear here.",
    likes: "likes",
  },
  es: {
    // Navbar
    searchPlaceholder: "Buscar objetos para alquilar...",
    listAnItem: "Publicar objeto",
    
    // Hero
    accessOverOwnership: "Acceso antes que propiedad",
    heroTitle1: "No necesitas comprarlo.",
    heroTitle2: "Solo alquílalo.",
    heroSubtitle: "Alquila objetos cotidianos de personas cerca de ti. Herramientas, cámaras, equipo de camping — todo lo que necesites, sin comprar.",
    heroSearch: "¿Qué necesitas alquilar?",
    
    // Categories
    catAll: "Todos",
    catTools: "Herramientas",
    catCamping: "Camping",
    catElectronics: "Electrónica",
    catKitchen: "Cocina",
    catSports: "Deportes",
    catGarden: "Jardín",
    catPhotography: "Fotografía",
    
    // Feed
    allItemsNearYou: "Todos los objetos cerca de ti",
    available: "Disponible",
    rented: "Alquilado",
    rentNow: "Alquilar",
    perDay: "/ día",
    rentals: "alquileres",
    
    // Item Detail
    backToMarketplace: "Volver al marketplace",
    aboutThisItem: "Sobre este objeto",
    whatsIncluded: "Qué incluye",
    aboutTheOwner: "Sobre el propietario",
    verified: "Verificado",
    memberSince: "Miembro desde",
    responseRate: "Tasa de respuesta",
    reviews: "opiniones",
    contact: "Contactar",
    rentThisItem: "Alquilar este objeto",
    notAvailable: "No disponible",
    availableForRent: "Disponible para alquilar",
    currentlyRented: "Actualmente alquilado",
    safeRentalGuaranteed: "Alquiler seguro garantizado",
    safeRentalDescription: "Cada alquiler está protegido por Swappy. Tu depósito se mantiene seguro y los objetos están asegurados contra daños.",
    today: "Hoy",
    unavailable: "No disponible",
    
    // Calendar
    monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    dayNamesShort: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"],
    
    // Rental Modal
    rentThisItemModal: "Alquilar este objeto",
    selectYourDates: "Selecciona tus fechas de alquiler",
    rentalPeriod: "Período de alquiler",
    startDate: "Fecha inicio",
    endDate: "Fecha fin",
    selectStartDate: "Seleccionar fecha inicio",
    selectEndDate: "Seleccionar fecha fin",
    
    // Insurance add-ons
    insuranceAddons: "Planes de protección",
    basicProtection: "Protección Básica",
    basicProtectionDesc: "Cubre arañazos menores y desgaste",
    fullProtection: "Protección Completa",
    fullProtectionDesc: "Cubre daños accidentales y robo",
    premiumProtection: "Protección Premium",
    premiumProtectionDesc: "Cobertura total + reemplazo exprés",
    noProtection: "Sin protección",
    recommended: "Recomendado",
    
    // Price breakdown
    protectionFee: "Tarifa de protección",
    serviceFee: "Tarifa de servicio",
    total: "Total",
    day: "día",
    days: "días",
    
    // Payment
    proceedToPayment: "Proceder al pago",
    paymentDetails: "Datos de pago",
    cardNumber: "Número de tarjeta",
    expiryDate: "Fecha de caducidad",
    cvv: "CVV",
    cardHolder: "Titular de la tarjeta",
    billingAddress: "Dirección de facturación",
    confirmAndPay: "Confirmar y pagar",
    back: "Volver",
    cancel: "Cancelar",
    requestRental: "Solicitar alquiler",
    orderSummary: "Resumen del pedido",
    paymentSecure: "Tu pago está protegido con encriptación de 256 bits",
    
    // Success
    rentalConfirmed: "¡Alquiler confirmado!",
    rentalConfirmedDesc: "Tu pago ha sido procesado. Recibirás un email de confirmación en breve.",
    paymentProcessed: "Pago procesado",
    
    // Contact Modal
    contactSeller: "Contactar vendedor",
    sendMessage: "Enviar mensaje",
    messagePlaceholder: "¡Hola! Me interesa alquilar este objeto. ¿Está disponible para...?",
    typicallyResponds: "Normalmente responde en",
    hours: "horas",
    messageSent: "¡Mensaje enviado!",
    messageSentDesc: "te responderá pronto.",
    
    // Profile
    editProfile: "Editar Perfil",
    activeListings: "Anuncios Activos",
    totalRentals: "Alquileres Totales",
    responseRateLabel: "Tasa de Respuesta",
    rentalHistory: "Historial de Alquileres",
    
    // Language
    language: "Idioma",
    english: "English",
    spanish: "Español",

    // List Item Modal
    listItemTitle: "Publicar un nuevo objeto",
    listItemSubtitle: "Comparte tus objetos con la comunidad",
    itemTitle: "Título del objeto",
    itemTitlePlaceholder: "ej. Taladro Bosch Professional",
    itemDescription: "Descripción",
    itemDescriptionPlaceholder: "Describe tu objeto, su estado y qué incluye...",
    pricePerDayLabel: "Precio por día (€)",
    pricePlaceholder: "15",
    categoryLabel: "Categoría",
    selectCategory: "Seleccionar categoría",
    locationLabel: "Ubicación",
    locationPlaceholder: "ej. Madrid, Centro",
    addPhotos: "Añadir fotos",
    addPhotosDesc: "Haz clic para subir o arrastra y suelta",
    publishItem: "Publicar objeto",
    itemPublished: "¡Objeto publicado!",
    itemPublishedDesc: "Tu objeto ya está activo en el marketplace.",

    // Messages
    messages: "Mensajes",
    noMessages: "No hay mensajes",
    noMessagesDesc: "Cuando contactes a un vendedor o recibas un mensaje, aparecerá aquí.",
    you: "Tú",
    askingAbout: "Consultando por:",
    writeMessage: "Escribe un mensaje...",
    itemLabel: "OB:",

    // Notifications
    notifications: "Notificaciones",
    noNotifications: "Sin notificaciones",
    noNotificationsDesc: "¡Estás al día! Las nuevas actividades aparecerán aquí.",
    close: "Cerrar",
    pendingRequests: "Solicitudes Pendientes",
    noPendingRequests: "Sin solicitudes pendientes",
    noPendingRequestsDesc: "Cuando alguien quiera alquilar tus objetos, aparecerá aquí.",
    accept: "Aceptar",
    reject: "Rechazar",
    wantsToRent: "quiere alquilar",

    // Auth
    login: "Iniciar Sesión",
    register: "Regístrate",
    welcomeBack: "Bienvenido de nuevo",
    createAccount: "Crea tu cuenta",
    loginSubtitle: "Entra a tu cuenta para continuar intercambiando.",
    registerSubtitle: "Únete a la comunidad de Swappy y empieza a alquilar.",
    fullName: "Nombre completo",
    fullNamePlaceholder: "Juan Pérez",
    email: "Correo Electrónico",
    emailPlaceholder: "tu@email.com",
    password: "Contraseña",
    processing: "Procesando...",
    enter: "Entrar",
    completeRegistration: "Completar Registro",
    checkEmailConfirmation: "Revisa tu correo para confirmar tu cuenta.",
    logOut: "Cerrar sesión",

    // Rentals (MyRentals)
    statusConfirmed: "Confirmado",
    statusActive: "Activo",
    statusCompleted: "Completado",
    statusCancelled: "Cancelado",
    statusPending: "Pendiente",
    insuranceNone: "Sin protección",
    insuranceBasic: "Básica",
    insuranceFull: "Completa",
    insurancePremium: "Premium",
    noRequests: "Sin solicitudes",
    noRequestsDesc: "Cuando alguien quiera alquilar tus objetos, aparecerán aquí.",
    noRentals: "No tienes alquileres",
    noRentalsDesc: "Cuando alquiles un objeto, aparecerá aquí para que puedas hacer seguimiento.",
    requestedBy: "Solicitado por:",
    rentedFrom: "Alquilado a:",
    myRequests: "Mis Peticiones",
    incomingRequests: "Solicitudes Recibidas",
    myRentals: "Mis Alquileres",

    // Profile extras
    locationNotSet: "Ubicación no especificada",
    noBio: "Sin bio — edita tu perfil para añadir una",
    reviewsTabTitle: "Reviews",
    reviewsTabEmpty: "Las reviews de tus objetos aparecerán aquí.",

    // Feed extras
    loadingItems: "Cargando items...",
    retry: "Reintentar",

    // ItemDetail reviews
    ratings: "Valoraciones",
    leaveRating: "Deja tu valoración",
    shareExperience: "Comparte tu experiencia... (opcional)",
    ratingSent: "¡Valoración enviada!",
    send: "Enviar",
    reviewOnlyAfterRental: "Solo puedes dejar una reseña una vez que hayas alquilado este producto y el periodo haya finalizado.",
    loginToReview: "Inicia sesión para dejar una valoración.",
    noRatingsYet: "Aún no hay valoraciones. ¡Sé el primero!",

    // Public profile
    viewProfile: "Ver perfil",
    sendMessageTo: "Enviar mensaje",
    userListings: "Anuncios",
    backToItem: "Volver",
    contactUser: "Contactar",

    // Follows & Likes
    follow: "Seguir",
    following: "Siguiendo",
    unfollow: "Dejar de seguir",
    followers: "seguidores",
    followingCount: "siguiendo",
    favorites: "Favoritos",
    noFavorites: "Sin favoritos",
    noFavoritesDesc: "Dale al corazón en los objetos que te gusten y aparecerán aquí.",
    likes: "me gusta",
  }
} as const;

export type TranslationKey = keyof typeof translations.en;
