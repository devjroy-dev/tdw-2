import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/vendor/login',
  },
  callbacks: {
    async session({ session, token }) {
      return session;
    },
    async jwt({ token, account }) {
      return token;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + '/vendor/dashboard';
    },
  },
});

export { handler as GET, handler as POST };
