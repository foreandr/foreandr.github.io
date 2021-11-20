using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;
using foreandr.github.IO.DAL;

namespace foreandrTest
{
    public class DAOTests
    {
        [Fact]
        public async Task Writer_GetByFirstNameTest()
        {
            ForeandrDAO dao = new ForeandrDAO();
            Writer selectedWriter = await dao.GetByFirstName("Andre");
            Assert.NotNull(selectedWriter);
        }
        [Fact]
        public async Task Writer_GetAll()
        {
            ForeandrDAO dao = new ForeandrDAO();
            var selectedWriters = await dao.GetAll();
            Assert.NotNull(selectedWriters);
        }
        /* HERE I WILL IMPLEMENT THE FOLLOWNG METHODS SOMEDAY
         * ADD
         * UPDATE
         * DELETE
         * ETC..
    }
}
