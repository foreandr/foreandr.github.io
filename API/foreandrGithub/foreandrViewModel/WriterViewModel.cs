using System;
using foreandr.github.IO.DAL;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;

namespace foreandrViewModels
{
    public class WriterViewModel
    {
        readonly private ForeandrDAO dao_;
        public int ID { get; set; } // NEW ADDITION, MAY NOT BE NECESSARY
        public string Firstname { get; set; }
        public string Lastname { get; set; }
        public DateTime DateOfbirth { get; set; }
        public string Country { get; set; }
       

        public WriterViewModel() // Dunno what this is for
        {
            dao_ = new ForeandrDAO();
        }

        // Find student using firstname
        public async Task GetByFirstName()
        {
            try
            {
                Writer writ = await dao_.GetByFirstName(Firstname);
                ID = writ.ID;
                Firstname = writ.FirstName;
                Lastname = writ.LastName;
                DateOfbirth = (DateTime)writ.DateOfBIrth; // Cast needed here?
                Country = writ.Country;
                
            }
            catch (NullReferenceException nex)
            {
                Debug.WriteLine(nex.Message);
                Firstname = "not Found";
            }
            catch (Exception ex)
            {
                Firstname = "not Found";
                Debug.WriteLine("Problem in " + GetType().Name + " " +
                    MethodBase.GetCurrentMethod().Name + " " + ex.Message);
                throw;
            }

        }
        
        // UPDATE -- lab 5 for reference

        // DELETE

        // ADD

        // GET ALL

    }
}
