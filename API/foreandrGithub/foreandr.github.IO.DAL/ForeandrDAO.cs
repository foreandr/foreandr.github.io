using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace foreandr.github.IO.DAL
{
    public class ForeandrDAO
    {
        public async Task<Writer> GetByFirstName(string firstname)
        {
            Writer selectedWriter = null;
            try
            {
                foreandrContext db_ = new foreandrContext();
                selectedWriter = await db_.Writers.FirstOrDefaultAsync(writ => writ.FirstName == firstname);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Problem in " + GetType().Name + " " +
                    MethodBase.GetCurrentMethod().Name + " " + ex.Message);
                throw;
            }
            return selectedWriter;
        }
        public async Task<List<Writer>> GetAll()
        {
            List<Writer> allWriters = new List<Writer>();
            try
            {
                foreandrContext db_ = new foreandrContext();
                allWriters = await db_.Writers.ToListAsync();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Problem in " + GetType().Name + " " +
                    MethodBase.GetCurrentMethod().Name + " " + ex.Message);
                throw;
            }
            return allWriters;
        }
    }
}
