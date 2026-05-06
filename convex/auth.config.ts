const authConfig = {
  providers: process.env.CLERK_JWT_ISSUER_DOMAIN
    ? [
        {
          domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
          applicationID: "convex",
        },
      ]
    : [],
};

export default authConfig;
