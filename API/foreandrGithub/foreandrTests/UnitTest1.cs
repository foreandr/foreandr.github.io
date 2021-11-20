using Xunit;
using foreandr.github.IO.DAL;
using System.Linq;

namespace foreandrTests
{
    public class UnitTest1
    {
        [Fact]
        public void Test1()
        {
            foreandrContext _db = new foreandrContext();

            var selectedBlog = from blogs in _db.BLOGs where blogs.ID == 1 select blogs;
            //Assert.True(selectedBlog.Count() > 0);
        }
    }
}
