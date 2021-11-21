SET QUOTED_IDENTIFIER ON
GO
SET ANSI_NULLS ON
GO
CREATE FUNCTION [dbo].[getPersonId] (
    -- Parameter datatype and scale match their targets
    @FirstName AS NVARCHAR(60)
    )
RETURNS INT
AS
BEGIN;
    DECLARE @ID INT; -- create a variable
    SELECT @ID = ID 
    FROM dbo.People
    WHERE FirstName = @FirstName
    -- Note that it is not necessary to initialize @ID or test for NULL, 
    -- NULL is the default, so if it is not overwritten by the select statement
    -- above, NULL will be returned.
    RETURN @ID;
END;
GO
