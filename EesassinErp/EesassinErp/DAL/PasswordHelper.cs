using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DAL
{
    public static class PasswordHelper
    {
        private const int WorkFactor = 12; // adjust 10-14 based on server power

        public static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: WorkFactor);
        }

        public static bool VerifyPassword(string password, string hashed)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashed);
        }
       

    }
}