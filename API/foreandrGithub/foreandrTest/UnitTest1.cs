using System;
using Xunit;
using foreandr.github.IO.DAL;
using System.Linq;
namespace foreandrTest
{
    public class UnitTest1
    {
        [Fact]
        public void Test1()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriter = from writer in _db.Writers where writer.ID == 1 select writer;
        }
        [Fact]
        public void Test12()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriter = _db.Writers.FirstOrDefault(writ => writ.ID == 1);
            Assert.True(selectedWriter.FirstName == "Andre");
        }
    }
}
