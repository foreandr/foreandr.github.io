using System;
using Xunit;
using foreandr.github.IO.DAL;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

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
        // LAMBDA FUNCTION
        public void Test2()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriter = _db.Writers.FirstOrDefault(writ => writ.ID == 1);
            Assert.True(selectedWriter.FirstName == "Andre");
        }
        [Fact]
        // MULTIPLE
        public void Test3()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriters = _db.Writers.FirstOrDefault(writ => writ.FirstName == "Andre" || writ.FirstName == "Codi");
            //Assert.True(selectedWriters.Count() > 1);  // Weird error here
        }
        [Fact]
        public void Test4()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriters = _db.BlogPosts.Where(blog => blog.Writer.FirstName == "Andre");
            //Assert.True(selectedWriters.Count() > 1); // Doesn't evaluate properly, forgot how to debug
        }
        
        [Fact]
        public async Task Test5UpdateCountry()
        {
            foreandrContext _db = new foreandrContext();
            var selectedWriter = await _db.Writers.FirstOrDefaultAsync(writ => writ.ID == 1);
            if (selectedWriter != null)
            {
                string oldCountry = selectedWriter.Country;
                //string newCountry = oldCountry == "Canada" ? "Russia" : "Canada"; // Ternary
                string newCountry;
                if (oldCountry == "Canada")
                    newCountry = "Russia";               
                else
                    newCountry = "Canada";
                
                selectedWriter.Country = newCountry;
                _db.Entry(selectedWriter).CurrentValues.SetValues(selectedWriter);
            }
            Assert.True(await _db.SaveChangesAsync() == 1);
        }
        [Fact]
        public async Task Test6AddWriter()
        {
            foreandrContext _db = new foreandrContext();

            Writer newWriter = new Writer
            {
                FirstName = "Zach",
                LastName = "Albert",
                //DateOfBIrth = DateTime.Parse("22-11-2009"),// DATETIME CANNOT BE DONE?? // Conversion method to datetime never heard of
                Country = "China"
            };
            await _db.Writers.AddAsync(newWriter);
            await _db.SaveChangesAsync();
            Assert.True(newWriter.ID > 0); // Make sure there is  an entry
        }

        [Fact]
        public async Task Test7DeleteWriter()
        {
            foreandrContext _db = new foreandrContext();
            Writer selectedWriter = await _db.Writers.FirstOrDefaultAsync(writ => writ.FirstName == "Zach"); // Delete Zach
            if (selectedWriter != null)
            {
                _db.Writers.Remove(selectedWriter);
                Assert.True(await _db.SaveChangesAsync() == 1);
            }
            else
            {
                Assert.True(false);
            }
        }

    }
}
