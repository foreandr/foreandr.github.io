using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using foreandrViewModels;
using System.Diagnostics;
using System.Reflection;


namespace foreandrGithubWebsite.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WriterController : ControllerBase
    {
        [HttpGet("{firstname}")]
        public async Task<IActionResult> GetByFirstName(string firstname)
        {
            try
            {
                WriterViewModel viewmodel = new WriterViewModel()
                {
                    Firstname = firstname
                };
                await viewmodel.GetByFirstName();
                return Ok(viewmodel);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Problem in" + GetType().Name + " " + 
                    MethodBase.GetCurrentMethod().Name + " " + ex.Message);
                return StatusCode(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
