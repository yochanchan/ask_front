let inMemoryAccessToken: string | null = null;

export const getAccessToken = () => inMemoryAccessToken;

export const setAccessToken = (token: string) => {
  inMemoryAccessToken = token;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};
