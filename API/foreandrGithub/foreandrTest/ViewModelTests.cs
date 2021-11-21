using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using foreandrViewModels;
using System.Diagnostics;

namespace foreandrTest
{
    public class ViewModelTests
    {
        [Fact]
        public async Task Writer_GetByFirstName()
        {
            WriterViewModel vm = null; // not sure what this does
            try
            {
                // SEEMS TO WORK NO MATTER WHAT
                // don't know how to debug
                vm = new WriterViewModel { Firstname = "Andre" };
                await vm.GetByFirstName();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Error - " + ex.Message);
            }
            Assert.NotNull(vm.Lastname);
        }

        // UPDATE

        // DELETE

        // ADD

        // GET ALL
    }
}
